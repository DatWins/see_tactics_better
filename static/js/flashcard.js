/* Lichess puzzle flashcard component for see_tactics_better.
   Every card is a puzzle card (entry.puzzle is always present).
   Front: static board at the pre-puzzle position + lead-in move list as text + prompt.
   Back:  solution moves as text + "View on Lichess" link. No board on back.
   Board drawn with Cburnett SVG pieces on a wood-coloured board. */
(function(){
  "use strict";

  var SQ = 45, DIM = 8*SQ, MARGIN = 20, VB = DIM + MARGIN*2;
  var COLORS = {
    light: "#eeeed2", dark: "#769656",
    lightLast: "#f7f769", darkLast: "#bbcb2b",
    margin: "#1b3a1b", coord: "#eeeed2"
  };
  var FILES = "abcdefgh";

  // Cburnett piece vectors (verbatim from python-chess svg.py)
  var PIECE_DEFS =
    '<g id="pc-b" fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zm6-4c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z" fill="#000" stroke-linecap="butt"/><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke="#fff" stroke-linejoin="miter"/></g>' +
    '<g id="pc-k" fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#000" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#000"/><path d="M20 8h5" stroke-linejoin="miter"/><path d="M32 29.5s8.5-4 6.03-9.65C34.15 14 25 18 22.5 24.5l.01 2.1-.01-2.1C20 18 9.906 14 6.997 19.85c-2.497 5.65 4.853 9 4.853 9M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke="#fff"/></g>' +
    '<g id="pc-n" fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" style="fill:#000000; stroke:#000000;"/><path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" style="fill:#000000; stroke:#000000;"/><path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" style="fill:#ececec; stroke:#ececec;"/><path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" style="fill:#ececec; stroke:#ececec;"/><path d="M 24.55,10.4 L 24.1,11.85 L 24.6,12 C 27.75,13 30.25,14.49 32.5,18.75 C 34.75,23.01 35.75,29.06 35.25,39 L 35.2,39.5 L 37.45,39.5 L 37.5,39 C 38,28.94 36.62,22.15 34.25,17.66 C 31.88,13.17 28.46,11.02 25.06,10.5 L 24.55,10.4 z " style="fill:#ececec; stroke:none;"/></g>' +
    '<g id="pc-p"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#000" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></g>' +
    '<g id="pc-q" fill="#000" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#000" stroke="none"><circle cx="6" cy="12" r="2.75"/><circle cx="14" cy="9" r="2.75"/><circle cx="22.5" cy="8" r="2.75"/><circle cx="31" cy="9" r="2.75"/><circle cx="39" cy="12" r="2.75"/></g><path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26zM9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11 38.5a35 35 1 0 0 23 0" fill="none" stroke-linecap="butt"/><path d="M11 29a35 35 1 0 1 23 0M12.5 31.5h20M11.5 34.5a35 35 1 0 0 22 0M10.5 37.5a35 35 1 0 0 24 0" fill="none" stroke="#fff"/></g>' +
    '<g id="pc-r" fill="#000" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12.5 32l1.5-2.5h17l1.5 2.5h-20zM12 36v-4h21v4H12z" stroke-linecap="butt"/><path d="M14 29.5v-13h17v13H14z" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M14 16.5L11 14h23l-3 2.5H14zM11 14V9h4v2h5V9h5v2h5V9h4v5H11z" stroke-linecap="butt"/><path d="M12 35.5h21M13 31.5h19M14 29.5h17M14 16.5h17M11 14h23" fill="none" stroke="#fff" stroke-width="1" stroke-linejoin="miter"/></g>' +
    '<g id="pc-B" fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><g fill="#fff" stroke-linecap="butt"><path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2zM15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2zM25 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 1 1 5 0z"/></g><path d="M17.5 26h10M15 30h15m-7.5-14.5v5M20 18h5" stroke-linejoin="miter"/></g>' +
    '<g id="pc-K" fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22.5 11.63V6M20 8h5" stroke-linejoin="miter"/><path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill="#fff" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" fill="#fff"/><path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0"/></g>' +
    '<g id="pc-N" fill="none" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18" style="fill:#ffffff; stroke:#000000;"/><path d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10" style="fill:#ffffff; stroke:#000000;"/><path d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z" style="fill:#000000; stroke:#000000;"/><path d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z" transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)" style="fill:#000000; stroke:#000000;"/></g>' +
    '<g id="pc-P"><path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-3 1.06-7.41 5.55-7.41 13.47h23c0-7.92-4.41-12.41-7.41-13.47 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fff" stroke="#000" stroke-width="1.5" stroke-linecap="round"/></g>' +
    '<g id="pc-Q" fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM24.5 7.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM41 12a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM16 8.5a2 2 0 1 1-4 0 2 2 0 1 1 4 0zM33 9a2 2 0 1 1-4 0 2 2 0 1 1 4 0z"/><path d="M9 26c8.5-1.5 21-1.5 27 0l2-12-7 11V11l-5.5 13.5-3-15-3 15-5.5-14V25L7 14l2 12zM9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" stroke-linecap="butt"/><path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" fill="none"/></g>' +
    '<g id="pc-R" fill="#fff" fill-rule="evenodd" stroke="#000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 39h27v-3H9v3zM12 36v-4h21v4H12zM11 14V9h4v2h5V9h5v2h5V9h4v5" stroke-linecap="butt"/><path d="M34 14l-3 3H14l-3-3"/><path d="M31 17v12.5H14V17" stroke-linecap="butt" stroke-linejoin="miter"/><path d="M31 29.5l1.5 2.5h-20l1.5-2.5"/><path d="M11 14h23" fill="none" stroke-linejoin="miter"/></g>';

  function mkRect(x, y, w, h, fill){
    var r = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    r.setAttribute("x", x); r.setAttribute("y", y);
    r.setAttribute("width", w); r.setAttribute("height", h);
    r.setAttribute("fill", fill);
    return r;
  }

  function addLabel(svg, cx, cy, text){
    var t = document.createElementNS("http://www.w3.org/2000/svg", "text");
    t.setAttribute("x", cx); t.setAttribute("y", cy);
    t.setAttribute("text-anchor", "middle");
    t.setAttribute("dominant-baseline", "central");
    t.setAttribute("fill", COLORS.coord);
    t.setAttribute("font-size", "11");
    t.setAttribute("font-weight", "600");
    t.textContent = text;
    svg.appendChild(t);
  }

  function buildBoard(container, flipped){
    var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 " + VB + " " + VB);
    svg.setAttribute("class", "fc-board-svg");

    var defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = PIECE_DEFS;
    svg.appendChild(defs);
    svg.appendChild(mkRect(0, 0, VB, VB, COLORS.margin));

    for (var r = 0; r < 8; r++){
      for (var f = 0; f < 8; f++){
        var x = MARGIN + f*SQ, y = MARGIN + r*SQ;
        var light = ((f + (8-r)) % 2 === 0);
        svg.appendChild(mkRect(x, y, SQ, SQ, light ? COLORS.light : COLORS.dark));
      }
    }
    // File labels: a-h left-to-right when white at bottom; h-a when black at bottom
    for (var f2 = 0; f2 < 8; f2++){
      var fileChar = flipped ? FILES[7-f2] : FILES[f2];
      addLabel(svg, MARGIN + f2*SQ + SQ/2, VB - MARGIN/2, fileChar);
    }
    // Rank labels: 8 at top, 1 at bottom when white at bottom; reversed when black at bottom
    for (var r2 = 0; r2 < 8; r2++){
      var rankNum = flipped ? String(r2+1) : String(8-r2);
      addLabel(svg, MARGIN/2, MARGIN + r2*SQ + SQ/2, rankNum);
    }

    var pieceLayer = document.createElementNS("http://www.w3.org/2000/svg", "g");
    pieceLayer.setAttribute("transform", "translate(" + MARGIN + "," + MARGIN + ")");
    svg.appendChild(pieceLayer);

    container.innerHTML = "";
    container.appendChild(svg);
    return {svg: svg, pieceLayer: pieceLayer};
  }

  function renderPieces(h, game, flipped){
    // chess.js board(): row 0 = rank 8 (black's back rank), row 7 = rank 1 (white's back rank)
    // Normal (white at bottom): rank 8 draws at SVG top → row 0 → drawRow = row (no change needed,
    //   but we must FLIP the chess.js rows so rank 1 is at bottom: drawRow = 7 - row)
    // Flipped (black at bottom): rank 1 draws at SVG bottom → drawRow = row (chess.js natural order)
    h.pieceLayer.innerHTML = "";
    var board = game.board();
    for (var row = 0; row < 8; row++){
      for (var col = 0; col < 8; col++){
        var piece = board[row][col];
        if (!piece) continue;
        var ch = piece.color === "w" ? piece.type.toUpperCase() : piece.type;
        var use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttributeNS("http://www.w3.org/1999/xlink", "href", "#pc-" + ch);
        use.setAttribute("href", "#pc-" + ch);
        // flipped=false (White to move): white at bottom → rank 1 at bottom → invert rows
        // flipped=true  (Black to move): black at bottom → rank 8 at bottom → keep rows
        var drawRow = flipped ? row : (7 - row);
        var drawCol = flipped ? (7 - col) : col;
        use.setAttribute("x", drawCol*SQ); use.setAttribute("y", drawRow*SQ);
        use.setAttribute("width", SQ); use.setAttribute("height", SQ);
        h.pieceLayer.appendChild(use);
      }
    }
  }

  function dataBaseUrl(){
    var cur = document.currentScript && document.currentScript.src;
    if (!cur){
      var scripts = document.getElementsByTagName("script");
      for (var i = 0; i < scripts.length; i++){
        if (/flashcard\.js(\?|$)/.test(scripts[i].src)) { cur = scripts[i].src; break; }
      }
    }
    if (!cur) return "/data/";
    return cur.replace(/js\/flashcard\.js(\?.*)?$/, "data/");
  }

  function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

  /* Build move number string from a SAN array and starting colour/move-number.
     e.g. startColor="White", startMoveNo=29, sans=["Raa7","h3","g3","Rce8"]
     → "29. Raa7 h3  30. g3 Rce8" */
  function formatMoves(sans, startColor, startMoveNo){
    var html = "", moveNo = startMoveNo, i = 0;
    if (sans.length && startColor === "Black"){
      html += moveNo + "… " + sans[0] + "  ";
      i = 1; moveNo++;
    }
    while (i < sans.length){
      html += moveNo + ". " + sans[i];
      i++;
      if (i < sans.length){ html += " " + sans[i] + "  "; i++; }
      moveNo++;
    }
    return html.trimRight();
  }

  function buildCardMarkup(deckId){
    return (
      '<div class="fc-scene"><div class="fc-card" id="' + deckId + '-card">' +
        /* FRONT */
        '<div class="fc-face" id="' + deckId + '-front">' +
          '<div class="fc-tag-row">' +
            '<span class="fc-tag" id="' + deckId + '-theme"></span>' +
            '<span class="fc-turn-pill" id="' + deckId + '-turnpill"></span>' +
          '</div>' +
          '<div class="fc-board-wrap" id="' + deckId + '-frontboard"></div>' +
          '<div class="fc-movelist" id="' + deckId + '-leadinmoves"></div>' +
          '<div class="fc-status" id="' + deckId + '-prompt"></div>' +
          '<div class="fc-controls">' +
            '<button class="fc-primary" id="' + deckId + '-flip">Flip card →</button>' +
          '</div>' +
        '</div>' +
        /* BACK */
        '<div class="fc-face fc-back">' +
          '<div class="fc-tag-row">' +
            '<a class="fc-tag fc-site-link" id="' + deckId + '-lichesslink" href="#" target="_blank" rel="noopener">View solution on Lichess →</a>' +
          '</div>' +
          '<div class="fc-movelist" id="' + deckId + '-solution"></div>' +
          '<div class="fc-controls">' +
            '<button class="fc-primary" id="' + deckId + '-flipback">← Flip back</button>' +
            '<button id="' + deckId + '-shuffle">Next puzzle</button>' +
          '</div>' +
        '</div>' +
      '</div></div>'
    );
  }

  function setupDeck(container, entry){
    var deckId = container.id;
    container.innerHTML = buildCardMarkup(deckId);

    var puzzle  = entry.puzzle;

    // Use contextFen/contextMoves when available (enriched with game context),
    // otherwise fall back to startFen + single lead-in move.
    var hasContext = entry.contextFen && entry.contextMoves && entry.contextMoves.length;
    var boardFen   = hasContext ? entry.contextFen : entry.startFen;
    var contextMoves = hasContext ? entry.contextMoves : (entry.moves || []);

    var boardParts  = boardFen.split(" ");
    var boardColor  = boardParts[1] === "b" ? "Black" : "White";
    var boardMoveNo = parseInt(boardParts[5], 10) || 1;

    // Turn pill: solver's side — use solverFen when available (correct color + move no.),
    // fall back to puzzle.fen
    var solverFen   = entry.solverFen || puzzle.fen;
    var puzzleColor = solverFen.split(" ")[1] === "b" ? "Black" : "White";
    var flipped     = (puzzleColor === "Black");  // Black to move → Black at bottom

    /* ---- FRONT ---- */
    // Board shows context start position (8 plies back from puzzle, or startFen)
    var h = buildBoard(document.getElementById(deckId + "-frontboard"), flipped);
    var game = new Chess(boardFen);
    renderPieces(h, game, flipped);

    document.getElementById(deckId + "-turnpill").textContent = puzzleColor + " to move";

    // Theme tag (top-left)
    document.getElementById(deckId + "-theme").textContent = entry.theme || "";

    // Context move list (8 plies shown as text above prompt)
    var leadinEl = document.getElementById(deckId + "-leadinmoves");
    if (contextMoves.length) {
      leadinEl.textContent = formatMoves(contextMoves, boardColor, boardMoveNo);
    } else {
      leadinEl.textContent = "";
    }

    // Puzzle prompt
    document.getElementById(deckId + "-prompt").textContent = puzzle.prompt || "";

    /* ---- BACK ---- */
    // Solution move list — use solverFen for correct move number
    var puzzleMoveNo = parseInt(solverFen.split(" ")[5], 10) || 1;
    var solEl = document.getElementById(deckId + "-solution");
    solEl.textContent = formatMoves(puzzle.solution || [], puzzleColor, puzzleMoveNo);

    // Lichess link
    var linkEl = document.getElementById(deckId + "-lichesslink");
    if (entry.site){
      linkEl.href = entry.site;
    } else {
      linkEl.removeAttribute("href");
      linkEl.style.cursor = "default";
    }

    /* ---- flip / shuffle controls ---- */
    var cardEl = document.getElementById(deckId + "-card");
    document.getElementById(deckId + "-flip").addEventListener("click", function(){
      cardEl.classList.add("flipped");
    });
    document.getElementById(deckId + "-flipback").addEventListener("click", function(){
      cardEl.classList.remove("flipped");
    });
    document.getElementById(deckId + "-shuffle").addEventListener("click", function(){
      var deck = container.__fcDeck;
      if (deck && deck.length > 1){
        var next = pick(deck.filter(function(e){ return e !== entry; }));
        setupDeck(container, next || pick(deck));
      }
    });
  }

  function initDeckContainer(container){
    var cat = container.dataset.category;
    fetch(dataBaseUrl() + cat + ".json")
      .then(function(r){ if (!r.ok) throw new Error("no data"); return r.json(); })
      .then(function(deck){
        if (!deck || !deck.length){
          container.innerHTML = '<p class="fc-empty">No puzzles yet for this theme — run <code>filter_puzzles.py</code> to generate them.</p>';
          return;
        }
        container.__fcDeck = deck;
        setupDeck(container, pick(deck));
      })
      .catch(function(){
        container.innerHTML = '<p class="fc-empty">Couldn’t load puzzles for this theme.</p>';
      });
  }

  document.addEventListener("DOMContentLoaded", function(){
    document.querySelectorAll(".flashcard-deck[data-category]").forEach(initDeckContainer);
  });
})();
