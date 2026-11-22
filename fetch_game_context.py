#!/usr/bin/env python3 -I
"""
fetch_game_context.py — enrich a puzzle JSON file with 8 plies of
game context fetched from the Lichess game export API.

For each puzzle entry the script:
  1. Reads the GameUrl embedded in entry["gameUrl"] (added by filter_puzzles.py).
  2. Fetches the game PGN from https://lichess.org/game/export/<GAMEID>
  3. Replays the PGN to find the puzzle start position (matching puzzle.fen).
  4. Steps back 8 half-moves (plies) from that point.
  5. Records contextFen (the board 8 plies back) and contextMoves (8 SANs
     leading up to — and including — the opponent's lead-in move).

After running, the entry has two new fields:
  "contextFen":   "<FEN 8 plies before puzzle>"
  "contextMoves": ["Qg4+", "Kb8", "Qg5", "Nc6", "b3", "Nxd4",  ...]   (8 SANs)

The front card JS then shows contextFen on the board and displays
contextMoves as the move list, so the user sees 8 plies of context
before being asked to find the winning move.

Usage
-----
  python fetch_game_context.py --json static/data/mate-in-4.json

Options
  --json   Path to the JSON file to enrich (modified in place).
  --plies  Number of context plies to go back (default: 8).
  --delay  Seconds between Lichess API requests (default: 1.5).
  --limit  Only process first N entries (default: all).

Requirements: pip install chess requests
"""

import argparse, json, re, time, sys
import chess, chess.pgn, io
import urllib.request, urllib.error

LICHESS_EXPORT = "https://lichess.org/game/export/{game_id}?moves=true&clocks=false&evals=false&opening=false"

def fetch_pgn(game_id: str) -> str | None:
    url = LICHESS_EXPORT.format(game_id=game_id)
    req = urllib.request.Request(url, headers={"Accept": "application/x-chess-pgn"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.read().decode("utf-8")
    except Exception as e:
        print(f"    ERROR fetching {game_id}: {e}", file=sys.stderr)
        return None

def game_id_from_url(url: str) -> str | None:
    """Extract the 8-char Lichess game ID from a URL like
    https://lichess.org/game/xXxXxXxX#29  or  https://lichess.org/game/xXxXxXxX/black#29"""
    m = re.search(r"lichess\.org/game/([A-Za-z0-9]{8})", url)
    return m.group(1) if m else None

def enrich_entry(entry: dict, plies: int) -> bool:
    """
    Fetch game context and add contextFen + contextMoves to entry.
    Returns True on success, False if the game could not be fetched/matched.
    """
    game_url = entry.get("gameUrl", "")
    if not game_url:
        return False

    game_id = game_id_from_url(game_url)
    if not game_id:
        print(f"    Cannot parse game ID from: {game_url}", file=sys.stderr)
        return False

    pgn_text = fetch_pgn(game_id)
    if not pgn_text:
        return False

    # Parse the PGN
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    if game is None:
        print(f"    Could not parse PGN for {game_id}", file=sys.stderr)
        return False

    # Collect all (fen, san) pairs by replaying the mainline
    # We want the FEN *before* each move and the SAN of that move.
    nodes = []  # list of (board_before_move, san)
    board = game.board()
    for node in game.mainline():
        move = node.move
        san  = board.san(move)
        nodes.append((board.fen(), san))
        board.push(move)
    # board now = final position; nodes[-1] = (fen_before_last_move, last_san)

    # Find where the puzzle starts: match startFen (position before lead-in)
    target_fen = entry["startFen"]
    # Normalise: strip halfmove/fullmove clocks for comparison
    def fen_core(f): return " ".join(f.split()[:4])

    target_core = fen_core(target_fen)
    puzzle_node_idx = None
    for i, (fen, _san) in enumerate(nodes):
        if fen_core(fen) == target_core:
            puzzle_node_idx = i
            break

    if puzzle_node_idx is None:
        print(f"    startFen not found in game {game_id}", file=sys.stderr)
        return False

    # We want 'plies' half-moves ending AT puzzle_node_idx (inclusive of lead-in).
    # The lead-in move is nodes[puzzle_node_idx] (the opponent's move that creates
    # the puzzle position).  We include it as the last of our context moves.
    # So context window = nodes[puzzle_node_idx - (plies-1) .. puzzle_node_idx]
    start_idx = max(0, puzzle_node_idx - (plies - 1))
    context_nodes = nodes[start_idx : puzzle_node_idx + 1]  # up to plies entries

    if not context_nodes:
        return False

    context_fen   = context_nodes[0][0]   # board FEN at start of context window
    context_moves = [san for (_fen, san) in context_nodes]

    # Derive the solver's FEN by replaying contextMoves from contextFen.
    # This gives the correct side-to-move and move number, which puzzle.fen
    # may not have (Lichess sometimes stores puzzle.fen deep in the solution).
    solver_board = chess.Board(context_fen)
    for _fen, san in context_nodes:
        move = solver_board.parse_san(san)
        solver_board.push(move)
    solver_fen = solver_board.fen()

    entry["contextFen"]   = context_fen
    entry["contextMoves"] = context_moves
    entry["solverFen"]    = solver_fen   # position where solver starts (correct color + move no.)
    return True


def main():
    ap = argparse.ArgumentParser(description="Enrich puzzle JSON with Lichess game context.")
    ap.add_argument("--json",  required=True, help="Path to puzzle JSON file (modified in place)")
    ap.add_argument("--plies", type=int, default=8, help="Context plies to fetch (default: 8)")
    ap.add_argument("--delay", type=float, default=1.5, help="Delay between API requests in seconds")
    ap.add_argument("--limit", type=int, default=0, help="Only process first N entries (0=all)")
    ap.add_argument("--force", action="store_true", help="Re-process already-enriched entries")
    args = ap.parse_args()

    with open(args.json, encoding="utf-8") as fh:
        entries = json.load(fh)

    total = len(entries) if not args.limit else min(args.limit, len(entries))
    print(f"Enriching {total} entries from {args.json} ({args.plies} plies each) …")

    ok = 0
    for i, entry in enumerate(entries[:total]):
        puzzle_id = entry.get("site", "").split("/")[-1]
        print(f"  [{i+1}/{total}] {puzzle_id} … ", end="", flush=True)

        if not args.force and "contextFen" in entry and "contextMoves" in entry and "solverFen" in entry:
            print("already done, skipping")
            ok += 1
            continue

        if not entry.get("gameUrl"):
            print("no gameUrl, skipping")
            continue

        success = enrich_entry(entry, args.plies)
        if success:
            print(f"ok ({len(entry['contextMoves'])} moves)")
            ok += 1
        else:
            print("FAILED")

        time.sleep(args.delay)

    # Write back
    with open(args.json, "w", encoding="utf-8") as fh:
        json.dump(entries, fh, ensure_ascii=False, indent=2)

    print(f"\nDone. {ok}/{total} enriched. Saved to {args.json}")


if __name__ == "__main__":
    main()
