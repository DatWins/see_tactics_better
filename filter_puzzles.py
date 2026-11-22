#!/usr/bin/env python3 -I
"""
filter_puzzles.py — convert Lichess puzzle CSV into per-theme JSON files
for the see_tactics_better flashcard site.

Usage
-----
1. Download the puzzle CSV from https://database.lichess.org/#puzzles
   (file is called lichess_db_puzzle.csv.zst).
   Decompress it:   zstd -d lichess_db_puzzle.csv.zst
2. Run:
       python filter_puzzles.py --csv lichess_db_puzzle.csv
   This writes one JSON file per THEME_MAP entry into static/data/.
   Add --max N to cap the number of puzzles per theme (default 200).

Lichess CSV columns (no header row):
  PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
  Themes, GameUrl, OpeningTags

The FEN column is the position *before* the first move in Moves.
The side to move in FEN is the OPPONENT of the player who makes the
first move — i.e. the puzzle starts with the OPPONENT moving first
(as a "pre-move" / lead-in), then the player to solve moves next.
We therefore show the FEN as-is (position before the lead-in), list
the full Moves sequence as the lead-in, and the puzzle.fen is the
position after those lead-in moves where the solver starts.
Wait — actually the Lichess format puts the puzzle start at the
position AFTER the first move in Moves (the opponent's move); the
Moves list starts with the opponent's forced reply and then the
solution moves interleaved.

Concretely:
  FEN    = position before the first move in Moves
  Moves  = [opp_move, solution_move1, opp_reply1, solution_move2, ...]
  puzzle.fen = position after Moves[0] (the opponent's move)
  puzzle.solution = Moves[1], Moves[2], ... (the interleaved solution)
  startFen  = FEN  (we show the board before the opponent's first move)
  entry.moves = [Moves[0]]  (the one lead-in move as text)

Moves in the CSV are UCI (e.g. e2e4), not SAN. We convert to SAN
using python-chess so the front end can display them nicely.

Requirements: python-chess   (pip install chess)
"""

import argparse, csv, json, os, sys
import chess

# ---------------------------------------------------------------------------
# Map: short slug (used as filename and data-category) → Lichess theme tag
# ---------------------------------------------------------------------------
THEME_MAP = {
    "mate-in-2":        "mateIn2",
    "mate-in-3":        "mateIn3",
    "mate-in-4":        "mateIn4",
    "smothered-mate":   "smotheredMate",
    "back-rank-mate":   "backRankMate",
    "fork":             "fork",
    "pin":              "pin",
    "skewer":           "skewer",
    "discovered-attack":"discoveredAttack",
    "hanging-piece":    "hangingPiece",
    "sacrifice":        "sacrifice",
    "deflection":       "deflection",
    "decoy":            "decoy",
    "clearance":        "clearance",
    "interference":     "interference",
    "kingside-attack":  "kingsideAttack",
}

# Human-readable prompt per theme
PROMPT_MAP = {
    "mate-in-2":        "Mate in 2.",
    "mate-in-3":        "Mate in 3.",
    "mate-in-4":        "Mate in 4.",
    "smothered-mate":   "Find the smothered mate.",
    "back-rank-mate":   "Find the back rank mate.",
    "fork":             "Find the fork.",
    "pin":              "Find the pin.",
    "skewer":           "Find the skewer.",
    "discovered-attack":"Find the discovered attack.",
    "hanging-piece":    "Win the hanging piece.",
    "sacrifice":        "Find the sacrifice.",
    "deflection":       "Find the deflection.",
    "decoy":            "Find the decoy.",
    "clearance":        "Find the clearance.",
    "interference":     "Find the interference.",
    "kingside-attack":  "Launch the kingside attack.",
}

def uci_to_san(board: chess.Board, uci: str) -> str:
    """Push a UCI move on a copy of board and return its SAN."""
    move = chess.Move.from_uci(uci)
    san = board.san(move)
    board.push(move)
    return san

def fen_color(fen: str) -> str:
    return "Black" if fen.split()[1] == "b" else "White"

def fen_move_number(fen: str) -> int:
    try:
        return int(fen.split()[5])
    except (IndexError, ValueError):
        return 1

def process_row(row) -> dict | None:
    """
    Convert one CSV row into a flashcard entry dict.
    Returns None if the row is malformed.
    """
    try:
        puzzle_id = row[0].strip()
        start_fen = row[1].strip()       # position before all moves
        moves_uci  = row[2].strip().split()
        themes     = row[7].strip().split() if len(row) > 7 else []
        game_url   = row[8].strip()     if len(row) > 8 else ""
    except IndexError:
        return None

    if len(moves_uci) < 2:
        return None   # need at least: opp_lead_in + 1 solution move

    board = chess.Board(start_fen)

    # Convert all moves to SAN (modifies board in place)
    all_sans = []
    try:
        for uci in moves_uci:
            all_sans.append(uci_to_san(board, uci))
    except Exception:
        return None

    # Lead-in = first SAN (the opponent's move before the puzzle starts)
    # Puzzle FEN = position after that first move
    lead_in_san = all_sans[0]
    puzzle_fen  = board.fen()   # board already has the lead-in move pushed
    solution_sans = all_sans[1:]

    # startFen colour/move-number for display on the front card
    start_color = fen_color(start_fen)
    start_move_no = fen_move_number(start_fen)

    # puzzle.fen colour: solver's side
    puzzle_color = fen_color(puzzle_fen)

    return {
        "site":     "https://lichess.org/training/" + puzzle_id,
        "gameUrl":  game_url,
        "theme":    ", ".join(themes),
        "startFen": start_fen,
        "moves":    [lead_in_san],   # one lead-in move shown as text
        "puzzle": {
            "prompt":   "",           # filled in by caller based on slug
            "fen":      puzzle_fen,
            "solution": solution_sans,
        }
    }

def main():
    ap = argparse.ArgumentParser(description="Filter Lichess puzzles CSV into per-theme JSON.")
    ap.add_argument("--csv",   required=True, help="Path to lichess_db_puzzle.csv")
    ap.add_argument("--out",   default="static/data", help="Output directory (default: static/data)")
    ap.add_argument("--max",   type=int, default=200, help="Max puzzles per theme (default: 200)")
    ap.add_argument("--theme", default="", help="Only process this slug, e.g. mate-in-4 (default: all)")
    args = ap.parse_args()

    os.makedirs(args.out, exist_ok=True)

    # Optionally restrict to one theme
    active_map = {k: v for k, v in THEME_MAP.items()
                  if not args.theme or k == args.theme}
    if args.theme and not active_map:
        print(f"Unknown theme slug '{args.theme}'. Valid slugs: {list(THEME_MAP)}")
        return

    # Build reverse map: lichess tag → list of slugs
    tag_to_slugs: dict[str, list[str]] = {}
    for slug, tag in active_map.items():
        tag_to_slugs.setdefault(tag, []).append(slug)

    buckets: dict[str, list] = {slug: [] for slug in active_map}
    filled_slugs: set[str] = set()

    print(f"Reading {args.csv} …")
    with open(args.csv, newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh)
        for lineno, row in enumerate(reader, 1):
            if lineno % 100_000 == 0:
                filled = sum(1 for s in THEME_MAP if len(buckets[s]) >= args.max)
                print(f"  line {lineno:,} — {filled}/{len(THEME_MAP)} themes full")
            if len(filled_slugs) == len(active_map):
                break  # all themes full

            themes_col = row[7].strip().split() if len(row) > 7 else []
            matched: set[str] = set()
            for t in themes_col:
                for slug in tag_to_slugs.get(t, []):
                    if slug not in filled_slugs:
                        matched.add(slug)

            if not matched:
                continue

            entry = process_row(row)
            if entry is None:
                continue

            for slug in matched:
                if len(buckets[slug]) < args.max:
                    e = dict(entry)
                    e["puzzle"] = dict(entry["puzzle"])
                    e["puzzle"]["prompt"] = PROMPT_MAP.get(slug, "Find the best move.")
                    buckets[slug].append(e)
                    if len(buckets[slug]) >= args.max:
                        filled_slugs.add(slug)

    # Write JSON files
    for slug, entries in buckets.items():
        path = os.path.join(args.out, slug + ".json")
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(entries, fh, ensure_ascii=False, indent=2)
        print(f"  wrote {len(entries):>4} puzzles → {path}")

    print("Done.")

if __name__ == "__main__":
    main()
