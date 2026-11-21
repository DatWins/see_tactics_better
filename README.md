# See Tactics Better

Lichess puzzle flashcards — fork, pin, mate in N, smothered mate, and more.

Built with Hugo + hugo-scroll theme. Flip each card to see the solution, then follow the Lichess link to replay it.

## Adding puzzles

1. Download the Lichess puzzle database from https://database.lichess.org/#puzzles
2. Decompress: `zstd -d lichess_db_puzzle.csv.zst`
3. Run the filter script (requires `pip install chess`):
   ```
   python filter_puzzles.py --csv lichess_db_puzzle.csv --max 200
   ```
   This writes one JSON file per theme into `static/data/`.
4. Commit and push — GitHub Pages rebuilds automatically.

## Adding new themes

Edit `filter_puzzles.py` → `THEME_MAP` and `PROMPT_MAP`, then add a new content page under `content/en/homepage/` with a matching `flashcard-deck` shortcode.
