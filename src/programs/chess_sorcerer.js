// CHESS SORCERER - 80s style chess with evil AI
// AIDEV-NOTE: Program interface: init(), update(deltaTime), getSegments(), handleKey(key, down)
// AIDEV-NOTE: Uses minimax with alpha-beta pruning, frame-limited incremental search
// AIDEV-NOTE: Player is always White, AI is Black

// ============================================================================
// CONSTANTS
// ============================================================================

// Piece codes (uppercase = white, lowercase = black)
const EMPTY = '.';
const WHITE_KING = 'K';
const WHITE_QUEEN = 'Q';
const WHITE_ROOK = 'R';
const WHITE_BISHOP = 'B';
const WHITE_KNIGHT = 'N';
const WHITE_PAWN = 'P';
const BLACK_KING = 'k';
const BLACK_QUEEN = 'q';
const BLACK_ROOK = 'r';
const BLACK_BISHOP = 'b';
const BLACK_KNIGHT = 'n';
const BLACK_PAWN = 'p';

// Piece values in centipawns (standard chess values)
const PIECE_VALUES = {
    'P': 100, 'p': 100,
    'N': 320, 'n': 320,
    'B': 330, 'b': 330,
    'R': 500, 'r': 500,
    'Q': 900, 'q': 900,
    'K': 20000, 'k': 20000
};

// Piece-square tables for positional evaluation (from white's perspective)
// AIDEV-NOTE: These are simplified 80s-era positional tables
const PAWN_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    50, 50, 50, 50, 50, 50, 50, 50,
    10, 10, 20, 30, 30, 20, 10, 10,
    5,  5, 10, 25, 25, 10,  5,  5,
    0,  0,  0, 20, 20,  0,  0,  0,
    5, -5,-10,  0,  0,-10, -5,  5,
    5, 10, 10,-20,-20, 10, 10,  5,
    0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_TABLE = [
    -50,-40,-30,-30,-30,-30,-40,-50,
    -40,-20,  0,  0,  0,  0,-20,-40,
    -30,  0, 10, 15, 15, 10,  0,-30,
    -30,  5, 15, 20, 20, 15,  5,-30,
    -30,  0, 15, 20, 20, 15,  0,-30,
    -30,  5, 10, 15, 15, 10,  5,-30,
    -40,-20,  0,  5,  5,  0,-20,-40,
    -50,-40,-30,-30,-30,-30,-40,-50
];

const BISHOP_TABLE = [
    -20,-10,-10,-10,-10,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5, 10, 10,  5,  0,-10,
    -10,  5,  5, 10, 10,  5,  5,-10,
    -10,  0, 10, 10, 10, 10,  0,-10,
    -10, 10, 10, 10, 10, 10, 10,-10,
    -10,  5,  0,  0,  0,  0,  5,-10,
    -20,-10,-10,-10,-10,-10,-10,-20
];

const ROOK_TABLE = [
    0,  0,  0,  0,  0,  0,  0,  0,
    5, 10, 10, 10, 10, 10, 10,  5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    -5,  0,  0,  0,  0,  0,  0, -5,
    0,  0,  0,  5,  5,  0,  0,  0
];

const QUEEN_TABLE = [
    -20,-10,-10, -5, -5,-10,-10,-20,
    -10,  0,  0,  0,  0,  0,  0,-10,
    -10,  0,  5,  5,  5,  5,  0,-10,
    -5,  0,  5,  5,  5,  5,  0, -5,
    0,  0,  5,  5,  5,  5,  0, -5,
    -10,  5,  5,  5,  5,  5,  0,-10,
    -10,  0,  5,  0,  0,  0,  0,-10,
    -20,-10,-10, -5, -5,-10,-10,-20
];

const KING_TABLE = [
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30,
    -20,-30,-30,-40,-40,-30,-30,-20,
    -10,-20,-20,-20,-20,-20,-20,-10,
    20, 20,  0,  0,  0,  0, 20, 20,
    20, 30, 10,  0,  0, 10, 30, 20
];

const PIECE_TABLES = {
    'P': PAWN_TABLE, 'p': PAWN_TABLE,
    'N': KNIGHT_TABLE, 'n': KNIGHT_TABLE,
    'B': BISHOP_TABLE, 'b': BISHOP_TABLE,
    'R': ROOK_TABLE, 'r': ROOK_TABLE,
    'Q': QUEEN_TABLE, 'q': QUEEN_TABLE,
    'K': KING_TABLE, 'k': KING_TABLE
};

// Opening book - very short, just for first 2 moves
// AIDEV-NOTE: Keys are move history joined by spaces, values are arrays of good responses
const OPENING_BOOK = {
    // White's first move (AI responds to these)
    'e2e4': ['e7e5', 'c7c5', 'e7e6'],  // Open game, Sicilian, French
    'd2d4': ['d7d5', 'g8f6', 'e7e6'],  // Queen's pawn, Indian, French
    'c2c4': ['e7e5', 'c7c5', 'g8f6'],  // English
    'g1f3': ['d7d5', 'g8f6', 'c7c5'],  // Reti
    // Second move responses
    'e2e4 e7e5': ['g1f3', 'f1c4', 'b1c3'],
    'e2e4 c7c5': ['g1f3', 'b1c3', 'd2d4'],
    'd2d4 d7d5': ['c2c4', 'g1f3', 'c1f4'],
    'd2d4 g8f6': ['c2c4', 'g1f3', 'c1g5'],
};

// Difficulty settings
const DIFFICULTY = {
    EASY: {
        name: 'EASY',
        searchTimeMs: 500,
        maxDepth: 2,
        suboptimalChance: 0.30,
        positionsPerFrame: 300
    },
    MEDIUM: {
        name: 'MEDIUM',
        searchTimeMs: 1500,
        maxDepth: 3,
        suboptimalChance: 0.10,
        positionsPerFrame: 500
    },
    HARD: {
        name: 'HARD',
        searchTimeMs: 3000,
        maxDepth: 4,
        suboptimalChance: 0,
        positionsPerFrame: 800
    },
    SORCERER: {
        name: 'SORCERER',
        searchTimeMs: 5000,
        maxDepth: 5,
        suboptimalChance: 0,
        positionsPerFrame: 1000
    }
};

// Eye emotions
const EMOTION = {
    NEUTRAL: 'neutral',
    ANGRY: 'angry',
    BORED: 'bored',
    CONFUSED: 'confused',
    AFRAID: 'afraid'
};

// ============================================================================
// CHESS GAME CLASS
// ============================================================================

// Difficulty options for menu
const DIFFICULTY_OPTIONS = ['EASY', 'MEDIUM', 'HARD', 'SORCERER'];

class ChessSorcererGame {
    constructor() {
        this.segments = [];
        this.keys = {};
        
        // Screen state: 'title' or 'playing'
        this.screen = 'title';
        this.menuSelection = 1;  // Default to MEDIUM (index 1)
        
        // Board layout (0,0 = a1, 7,7 = h8)
        // Stored as board[row][col] where row 0 = rank 1 (white's back rank)
        this.board = [];
        
        // Game state
        this.turn = 'white';  // 'white' or 'black'
        this.moveHistory = [];  // Array of move strings like 'e2e4'
        this.selectedSquare = null;  // {row, col} or null
        this.cursorRow = 1;  // Start on rank 2 (pawn row)
        this.cursorCol = 4;  // Start on e-file
        this.legalMoves = [];  // Legal moves for selected piece
        this.lastMove = null;  // {from: {row, col}, to: {row, col}}
        
        // Castling rights
        this.castling = {
            whiteKingside: true,
            whiteQueenside: true,
            blackKingside: true,
            blackQueenside: true
        };
        
        // En passant target square (null or {row, col})
        this.enPassant = null;
        
        // Game end state
        this.gameOver = false;
        this.gameResult = '';  // 'white', 'black', 'draw'
        this.gameEndReason = '';
        
        // AI state
        this.difficulty = DIFFICULTY.MEDIUM;
        this.aiThinking = false;
        this.aiSearchState = null;
        this.aiBestMove = null;
        this.aiMoveScores = [];  // [{move, score}] for debug display
        this.positionsEvaluated = 0;
        this.currentSearchDepth = 0;
        this.aiTurnStartTime = 0;  // When AI turn began (for minimum delay)
        
        // Player move evaluation
        this.playerMoveScores = [];  // Evaluated moves for player
        this.lastPlayerMoveQuality = 0;  // -1 to 1, how good was player's move
        
        // Sorcerer eyes
        this.emotion = EMOTION.NEUTRAL;
        this.eyeTargetX = 0.5;
        this.eyeTargetY = 0.5;
        this.eyePupilX = 0.5;
        this.eyePupilY = 0.5;
        this.blinkTimer = 0;
        this.isBlinking = false;
        this.emotionTimer = 0;
        
        // Debug display
        this.showDebug = false;
        
        // Animation
        this.animatingMove = false;
        this.animProgress = 0;
        this.animFrom = null;
        this.animTo = null;
        this.animPiece = null;
        
        // Sorcerer voice lines - played when AI starts thinking
        this.sorcererSounds = [
            new Audio('sounds/chess_sorceror/A Fools Move.mp3'),
            new Audio('sounds/chess_sorceror/Bats.mp3'),
            new Audio('sounds/chess_sorceror/Battle it Is.mp3'),
            new Audio('sounds/chess_sorceror/I knew you would do that.mp3'),
            new Audio('sounds/chess_sorceror/Ruined.mp3'),
            new Audio('sounds/chess_sorceror/What\'s the Point of Chess.mp3'),
            new Audio('sounds/chess_sorceror/Sorcerer\'s Pawn.mp3')
        ];
        // Set volume for all sounds
        this.sorcererSounds.forEach(s => s.volume = 0.7);
        this.lastSorcererSoundIdx = -1;  // Track last played to avoid repeats
        
        this.init();
    }
    
    init() {
        this.segments = [];
        this.screen = 'title';
        this.menuSelection = 1;  // Default MEDIUM
        
        this.resetGame();
    }
    
    resetGame() {
        this.setupInitialPosition();
        
        this.turn = 'white';
        this.moveHistory = [];
        this.selectedSquare = null;
        this.cursorRow = 1;
        this.cursorCol = 4;
        this.legalMoves = [];
        this.lastMove = null;
        
        this.castling = {
            whiteKingside: true,
            whiteQueenside: true,
            blackKingside: true,
            blackQueenside: true
        };
        this.enPassant = null;
        
        this.gameOver = false;
        this.gameResult = '';
        this.gameEndReason = '';
        
        this.aiThinking = false;
        this.aiSearchState = null;
        this.aiBestMove = null;
        this.aiMoveScores = [];
        this.positionsEvaluated = 0;
        this.currentSearchDepth = 0;
        
        this.playerMoveScores = [];
        this.lastPlayerMoveQuality = 0;
        
        this.emotion = EMOTION.NEUTRAL;
        this.blinkTimer = 3 + Math.random() * 4;
        this.isBlinking = false;
        this.emotionTimer = 0;
        
        this.animatingMove = false;
        
        // Start evaluating player moves
        this.startPlayerEvaluation();
    }
    
    startGame() {
        // Set difficulty based on menu selection
        const diffKey = DIFFICULTY_OPTIONS[this.menuSelection];
        this.difficulty = DIFFICULTY[diffKey];
        this.screen = 'playing';
        this.resetGame();
    }
    
    setupInitialPosition() {
        this.board = [
            [WHITE_ROOK, WHITE_KNIGHT, WHITE_BISHOP, WHITE_QUEEN, WHITE_KING, WHITE_BISHOP, WHITE_KNIGHT, WHITE_ROOK],
            [WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN, WHITE_PAWN],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
            [BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN, BLACK_PAWN],
            [BLACK_ROOK, BLACK_KNIGHT, BLACK_BISHOP, BLACK_QUEEN, BLACK_KING, BLACK_BISHOP, BLACK_KNIGHT, BLACK_ROOK]
        ];
    }
    
    // ========================================================================
    // MOVE GENERATION
    // ========================================================================
    
    isWhitePiece(piece) {
        return piece !== EMPTY && piece === piece.toUpperCase();
    }
    
    isBlackPiece(piece) {
        return piece !== EMPTY && piece === piece.toLowerCase();
    }
    
    isPieceColor(piece, color) {
        if (piece === EMPTY) return false;
        return color === 'white' ? this.isWhitePiece(piece) : this.isBlackPiece(piece);
    }
    
    getOppositeColor(color) {
        return color === 'white' ? 'black' : 'white';
    }
    
    isValidSquare(row, col) {
        return row >= 0 && row < 8 && col >= 0 && col < 8;
    }
    
    // Generate all legal moves for the current position
    generateAllMoves(color) {
        const moves = [];
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.isPieceColor(this.board[row][col], color)) {
                    const pieceMoves = this.generatePieceMoves(row, col);
                    moves.push(...pieceMoves);
                }
            }
        }
        return moves;
    }
    
    // Generate moves for a specific piece
    generatePieceMoves(row, col) {
        const piece = this.board[row][col];
        if (piece === EMPTY) return [];
        
        const pieceType = piece.toUpperCase();
        const color = this.isWhitePiece(piece) ? 'white' : 'black';
        let moves = [];
        
        switch (pieceType) {
            case 'P': moves = this.generatePawnMoves(row, col, color); break;
            case 'N': moves = this.generateKnightMoves(row, col, color); break;
            case 'B': moves = this.generateBishopMoves(row, col, color); break;
            case 'R': moves = this.generateRookMoves(row, col, color); break;
            case 'Q': moves = this.generateQueenMoves(row, col, color); break;
            case 'K': moves = this.generateKingMoves(row, col, color); break;
        }
        
        // Filter out moves that leave king in check
        return moves.filter(move => !this.wouldBeInCheck(move, color));
    }
    
    generatePawnMoves(row, col, color) {
        const moves = [];
        const direction = color === 'white' ? 1 : -1;
        const startRow = color === 'white' ? 1 : 6;
        const enemyColor = this.getOppositeColor(color);
        
        // Single push
        const newRow = row + direction;
        if (this.isValidSquare(newRow, col) && this.board[newRow][col] === EMPTY) {
            moves.push({ from: {row, col}, to: {row: newRow, col} });
            
            // Double push from starting position
            if (row === startRow) {
                const doubleRow = row + 2 * direction;
                if (this.board[doubleRow][col] === EMPTY) {
                    moves.push({ from: {row, col}, to: {row: doubleRow, col} });
                }
            }
        }
        
        // Captures
        for (const dc of [-1, 1]) {
            const newCol = col + dc;
            if (this.isValidSquare(newRow, newCol)) {
                // Regular capture
                if (this.isPieceColor(this.board[newRow][newCol], enemyColor)) {
                    moves.push({ from: {row, col}, to: {row: newRow, col: newCol} });
                }
                // En passant
                if (this.enPassant && this.enPassant.row === newRow && this.enPassant.col === newCol) {
                    moves.push({ from: {row, col}, to: {row: newRow, col: newCol}, enPassant: true });
                }
            }
        }
        
        return moves;
    }
    
    generateKnightMoves(row, col, color) {
        const moves = [];
        const offsets = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
        
        for (const [dr, dc] of offsets) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidSquare(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target === EMPTY || !this.isPieceColor(target, color)) {
                    moves.push({ from: {row, col}, to: {row: newRow, col: newCol} });
                }
            }
        }
        return moves;
    }
    
    generateSlidingMoves(row, col, color, directions) {
        const moves = [];
        for (const [dr, dc] of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            
            while (this.isValidSquare(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target === EMPTY) {
                    moves.push({ from: {row, col}, to: {row: newRow, col: newCol} });
                } else if (!this.isPieceColor(target, color)) {
                    moves.push({ from: {row, col}, to: {row: newRow, col: newCol} });
                    break;
                } else {
                    break;
                }
                newRow += dr;
                newCol += dc;
            }
        }
        return moves;
    }
    
    generateBishopMoves(row, col, color) {
        return this.generateSlidingMoves(row, col, color, [[-1,-1],[-1,1],[1,-1],[1,1]]);
    }
    
    generateRookMoves(row, col, color) {
        return this.generateSlidingMoves(row, col, color, [[-1,0],[1,0],[0,-1],[0,1]]);
    }
    
    generateQueenMoves(row, col, color) {
        return this.generateSlidingMoves(row, col, color, 
            [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]);
    }
    
    generateKingMoves(row, col, color) {
        const moves = [];
        const directions = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
        
        for (const [dr, dc] of directions) {
            const newRow = row + dr;
            const newCol = col + dc;
            if (this.isValidSquare(newRow, newCol)) {
                const target = this.board[newRow][newCol];
                if (target === EMPTY || !this.isPieceColor(target, color)) {
                    moves.push({ from: {row, col}, to: {row: newRow, col: newCol} });
                }
            }
        }
        
        // Castling
        if (color === 'white') {
            if (this.castling.whiteKingside && this.canCastle(color, 'kingside')) {
                moves.push({ from: {row, col}, to: {row: 0, col: 6}, castling: 'kingside' });
            }
            if (this.castling.whiteQueenside && this.canCastle(color, 'queenside')) {
                moves.push({ from: {row, col}, to: {row: 0, col: 2}, castling: 'queenside' });
            }
        } else {
            if (this.castling.blackKingside && this.canCastle(color, 'kingside')) {
                moves.push({ from: {row, col}, to: {row: 7, col: 6}, castling: 'kingside' });
            }
            if (this.castling.blackQueenside && this.canCastle(color, 'queenside')) {
                moves.push({ from: {row, col}, to: {row: 7, col: 2}, castling: 'queenside' });
            }
        }
        
        return moves;
    }
    
    canCastle(color, side) {
        const row = color === 'white' ? 0 : 7;
        const kingCol = 4;
        
        // Check if in check
        if (this.isInCheck(color)) return false;
        
        if (side === 'kingside') {
            // Check squares between king and rook are empty
            if (this.board[row][5] !== EMPTY || this.board[row][6] !== EMPTY) return false;
            // Check king doesn't pass through check
            if (this.isSquareAttacked(row, 5, this.getOppositeColor(color))) return false;
            if (this.isSquareAttacked(row, 6, this.getOppositeColor(color))) return false;
        } else {
            // Queenside
            if (this.board[row][1] !== EMPTY || this.board[row][2] !== EMPTY || this.board[row][3] !== EMPTY) return false;
            if (this.isSquareAttacked(row, 2, this.getOppositeColor(color))) return false;
            if (this.isSquareAttacked(row, 3, this.getOppositeColor(color))) return false;
        }
        
        return true;
    }
    
    findKing(color) {
        const kingPiece = color === 'white' ? WHITE_KING : BLACK_KING;
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                if (this.board[row][col] === kingPiece) {
                    return {row, col};
                }
            }
        }
        return null;
    }
    
    isSquareAttacked(row, col, byColor) {
        // Check if square is attacked by any piece of byColor
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (this.isPieceColor(this.board[r][c], byColor)) {
                    if (this.canPieceAttack(r, c, row, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    canPieceAttack(fromRow, fromCol, toRow, toCol) {
        const piece = this.board[fromRow][fromCol];
        const pieceType = piece.toUpperCase();
        const color = this.isWhitePiece(piece) ? 'white' : 'black';
        
        const dr = toRow - fromRow;
        const dc = toCol - fromCol;
        
        switch (pieceType) {
            case 'P': {
                const direction = color === 'white' ? 1 : -1;
                return dr === direction && Math.abs(dc) === 1;
            }
            case 'N':
                return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || 
                       (Math.abs(dr) === 1 && Math.abs(dc) === 2);
            case 'B':
                if (Math.abs(dr) !== Math.abs(dc) || dr === 0) return false;
                return this.isClearDiagonal(fromRow, fromCol, toRow, toCol);
            case 'R':
                if (dr !== 0 && dc !== 0) return false;
                return this.isClearStraight(fromRow, fromCol, toRow, toCol);
            case 'Q':
                if (dr === 0 || dc === 0) {
                    return this.isClearStraight(fromRow, fromCol, toRow, toCol);
                } else if (Math.abs(dr) === Math.abs(dc)) {
                    return this.isClearDiagonal(fromRow, fromCol, toRow, toCol);
                }
                return false;
            case 'K':
                return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
        }
        return false;
    }
    
    isClearStraight(fromRow, fromCol, toRow, toCol) {
        const dr = Math.sign(toRow - fromRow);
        const dc = Math.sign(toCol - fromCol);
        let r = fromRow + dr;
        let c = fromCol + dc;
        
        while (r !== toRow || c !== toCol) {
            if (this.board[r][c] !== EMPTY) return false;
            r += dr;
            c += dc;
        }
        return true;
    }
    
    isClearDiagonal(fromRow, fromCol, toRow, toCol) {
        const dr = Math.sign(toRow - fromRow);
        const dc = Math.sign(toCol - fromCol);
        let r = fromRow + dr;
        let c = fromCol + dc;
        
        while (r !== toRow || c !== toCol) {
            if (this.board[r][c] !== EMPTY) return false;
            r += dr;
            c += dc;
        }
        return true;
    }
    
    isInCheck(color) {
        const king = this.findKing(color);
        if (!king) return false;
        return this.isSquareAttacked(king.row, king.col, this.getOppositeColor(color));
    }
    
    wouldBeInCheck(move, color) {
        // Make the move temporarily
        const savedBoard = this.board.map(row => [...row]);
        const savedEnPassant = this.enPassant;
        
        this.applyMoveToBoard(move);
        const inCheck = this.isInCheck(color);
        
        // Restore
        this.board = savedBoard;
        this.enPassant = savedEnPassant;
        
        return inCheck;
    }
    
    applyMoveToBoard(move) {
        const piece = this.board[move.from.row][move.from.col];
        
        // Handle en passant capture
        if (move.enPassant) {
            const captureRow = move.from.row;
            this.board[captureRow][move.to.col] = EMPTY;
        }
        
        // Handle castling
        if (move.castling) {
            const row = move.from.row;
            if (move.castling === 'kingside') {
                this.board[row][5] = this.board[row][7];
                this.board[row][7] = EMPTY;
            } else {
                this.board[row][3] = this.board[row][0];
                this.board[row][0] = EMPTY;
            }
        }
        
        // Move the piece
        this.board[move.to.row][move.to.col] = piece;
        this.board[move.from.row][move.from.col] = EMPTY;
        
        // Handle pawn promotion (always queen for simplicity)
        if (piece.toUpperCase() === 'P') {
            if ((this.isWhitePiece(piece) && move.to.row === 7) ||
                (this.isBlackPiece(piece) && move.to.row === 0)) {
                this.board[move.to.row][move.to.col] = this.isWhitePiece(piece) ? WHITE_QUEEN : BLACK_QUEEN;
            }
        }
    }
    
    makeMove(move) {
        const piece = this.board[move.from.row][move.from.col];
        const captured = this.board[move.to.row][move.to.col];
        
        // Apply the move
        this.applyMoveToBoard(move);
        
        // Update en passant
        this.enPassant = null;
        if (piece.toUpperCase() === 'P' && Math.abs(move.to.row - move.from.row) === 2) {
            this.enPassant = {
                row: (move.from.row + move.to.row) / 2,
                col: move.from.col
            };
        }
        
        // Update castling rights
        if (piece === WHITE_KING) {
            this.castling.whiteKingside = false;
            this.castling.whiteQueenside = false;
        } else if (piece === BLACK_KING) {
            this.castling.blackKingside = false;
            this.castling.blackQueenside = false;
        } else if (piece === WHITE_ROOK) {
            if (move.from.col === 0) this.castling.whiteQueenside = false;
            if (move.from.col === 7) this.castling.whiteKingside = false;
        } else if (piece === BLACK_ROOK) {
            if (move.from.col === 0) this.castling.blackQueenside = false;
            if (move.from.col === 7) this.castling.blackKingside = false;
        }
        
        // Record move
        const moveStr = this.moveToString(move);
        this.moveHistory.push(moveStr);
        this.lastMove = move;
        
        // Switch turn
        this.turn = this.getOppositeColor(this.turn);
        
        // Check for game end
        this.checkGameEnd();
        
        return captured !== EMPTY;
    }
    
    moveToString(move) {
        const fromFile = String.fromCharCode(97 + move.from.col);
        const fromRank = move.from.row + 1;
        const toFile = String.fromCharCode(97 + move.to.col);
        const toRank = move.to.row + 1;
        return `${fromFile}${fromRank}${toFile}${toRank}`;
    }
    
    stringToMove(str) {
        if (str.length < 4) return null;
        return {
            from: {
                col: str.charCodeAt(0) - 97,
                row: parseInt(str[1]) - 1
            },
            to: {
                col: str.charCodeAt(2) - 97,
                row: parseInt(str[3]) - 1
            }
        };
    }
    
    checkGameEnd() {
        const moves = this.generateAllMoves(this.turn);
        
        if (moves.length === 0) {
            this.gameOver = true;
            if (this.isInCheck(this.turn)) {
                this.gameResult = this.getOppositeColor(this.turn);
                this.gameEndReason = 'CHECKMATE';
            } else {
                this.gameResult = 'draw';
                this.gameEndReason = 'STALEMATE';
            }
        }
        
        // Insufficient material check (simplified)
        // TODO: Could add more thorough draw detection
    }
    
    // ========================================================================
    // AI ENGINE
    // ========================================================================
    
    evaluatePosition() {
        let score = 0;
        
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece === EMPTY) continue;
                
                const value = PIECE_VALUES[piece];
                const table = PIECE_TABLES[piece];
                
                // Piece-square table index (flip for black)
                const tableRow = this.isWhitePiece(piece) ? 7 - row : row;
                const tableIndex = tableRow * 8 + col;
                const positional = table[tableIndex];
                
                if (this.isWhitePiece(piece)) {
                    score += value + positional;
                } else {
                    score -= value + positional;
                }
            }
        }
        
        // Mobility bonus (simplified)
        const whiteMoves = this.generateAllMoves('white').length;
        const blackMoves = this.generateAllMoves('black').length;
        score += (whiteMoves - blackMoves) * 5;
        
        return score;
    }
    
    // Minimax with alpha-beta pruning
    minimax(depth, alpha, beta, maximizing, positionsLimit) {
        this.positionsEvaluated++;
        
        if (positionsLimit && this.positionsEvaluated >= positionsLimit) {
            return { score: this.evaluatePosition(), move: null, cutoff: true };
        }
        
        if (depth === 0) {
            return { score: this.evaluatePosition(), move: null };
        }
        
        const color = maximizing ? 'white' : 'black';
        const moves = this.generateAllMoves(color);
        
        if (moves.length === 0) {
            if (this.isInCheck(color)) {
                // Checkmate
                return { score: maximizing ? -100000 + (this.difficulty.maxDepth - depth) : 100000 - (this.difficulty.maxDepth - depth), move: null };
            }
            // Stalemate
            return { score: 0, move: null };
        }
        
        // Move ordering for better pruning (captures first)
        moves.sort((a, b) => {
            const captureA = this.board[a.to.row][a.to.col] !== EMPTY ? 1 : 0;
            const captureB = this.board[b.to.row][b.to.col] !== EMPTY ? 1 : 0;
            return captureB - captureA;
        });
        
        let bestMove = moves[0];
        let bestScore = maximizing ? -Infinity : Infinity;
        
        for (const move of moves) {
            // Save state
            const savedBoard = this.board.map(row => [...row]);
            const savedCastling = {...this.castling};
            const savedEnPassant = this.enPassant;
            
            // Make move
            this.applyMoveToBoard(move);
            if (move.enPassant || (this.board[move.to.row][move.to.col].toUpperCase() === 'P' && Math.abs(move.to.row - move.from.row) === 2)) {
                // Update en passant for child
                if (Math.abs(move.to.row - move.from.row) === 2) {
                    this.enPassant = { row: (move.from.row + move.to.row) / 2, col: move.from.col };
                } else {
                    this.enPassant = null;
                }
            } else {
                this.enPassant = null;
            }
            
            const result = this.minimax(depth - 1, alpha, beta, !maximizing, positionsLimit);
            
            // Restore state
            this.board = savedBoard;
            this.castling = savedCastling;
            this.enPassant = savedEnPassant;
            
            if (result.cutoff) {
                return { score: result.score, move: bestMove, cutoff: true };
            }
            
            if (maximizing) {
                if (result.score > bestScore) {
                    bestScore = result.score;
                    bestMove = move;
                }
                alpha = Math.max(alpha, bestScore);
            } else {
                if (result.score < bestScore) {
                    bestScore = result.score;
                    bestMove = move;
                }
                beta = Math.min(beta, bestScore);
            }
            
            if (beta <= alpha) {
                break; // Alpha-beta cutoff
            }
        }
        
        return { score: bestScore, move: bestMove };
    }
    
    startAISearch() {
        this.aiThinking = true;
        this.aiBestMove = null;
        this.aiMoveScores = [];
        this.positionsEvaluated = 0;
        this.currentSearchDepth = 0;
        this.aiTurnStartTime = performance.now();  // Track when AI turn started
        
        // Check opening book first
        const bookMove = this.getOpeningBookMove();
        if (bookMove) {
            this.aiBestMove = bookMove;
            this.aiThinking = false;
            this.emotion = EMOTION.NEUTRAL;
            return;
        }
        
        this.aiSearchState = {
            startTime: performance.now(),
            currentDepth: 1,
            bestMoveAtDepth: null,
            allMoveScores: []
        };
        
        this.emotion = EMOTION.NEUTRAL;
    }
    
    getOpeningBookMove() {
        const historyKey = this.moveHistory.join(' ');
        const bookMoves = OPENING_BOOK[historyKey];
        
        if (bookMoves && bookMoves.length > 0) {
            const moveStr = bookMoves[Math.floor(Math.random() * bookMoves.length)];
            return this.stringToMove(moveStr);
        }
        return null;
    }
    
    continueAISearch() {
        if (!this.aiThinking || !this.aiSearchState) return;
        
        const elapsed = performance.now() - this.aiSearchState.startTime;
        const timeLimit = this.difficulty.searchTimeMs;
        
        // Check if we've exceeded time limit
        if (elapsed >= timeLimit) {
            this.finishAISearch();
            return;
        }
        
        // Run limited positions this frame
        const positionsThisFrame = this.difficulty.positionsPerFrame;
        const startPositions = this.positionsEvaluated;
        
        // Iterative deepening
        const depth = this.aiSearchState.currentDepth;
        if (depth <= this.difficulty.maxDepth) {
            this.currentSearchDepth = depth;
            
            // Search at current depth
            const result = this.minimax(depth, -Infinity, Infinity, false, startPositions + positionsThisFrame);
            
            if (!result.cutoff && result.move) {
                this.aiSearchState.bestMoveAtDepth = result.move;
                
                // Collect all move scores at this depth
                const moves = this.generateAllMoves('black');
                this.aiSearchState.allMoveScores = moves.map(move => {
                    const savedBoard = this.board.map(row => [...row]);
                    const savedCastling = {...this.castling};
                    const savedEnPassant = this.enPassant;
                    
                    this.applyMoveToBoard(move);
                    const score = this.evaluatePosition();
                    
                    this.board = savedBoard;
                    this.castling = savedCastling;
                    this.enPassant = savedEnPassant;
                    
                    return { move, score };
                });
                
                this.aiSearchState.allMoveScores.sort((a, b) => a.score - b.score);
                
                // Move to next depth
                this.aiSearchState.currentDepth++;
            }
        } else {
            // Reached max depth, finish search
            this.finishAISearch();
        }
    }
    
    finishAISearch() {
        if (!this.aiSearchState) return;
        
        let bestMove = this.aiSearchState.bestMoveAtDepth;
        this.aiMoveScores = this.aiSearchState.allMoveScores;
        
        // Suboptimal move chance
        if (this.difficulty.suboptimalChance > 0 && Math.random() < this.difficulty.suboptimalChance) {
            const moves = this.generateAllMoves('black');
            if (moves.length > 1) {
                // Pick a random move that's not the best
                const otherMoves = moves.filter(m => 
                    m.from.row !== bestMove.from.row || 
                    m.from.col !== bestMove.from.col ||
                    m.to.row !== bestMove.to.row ||
                    m.to.col !== bestMove.to.col
                );
                if (otherMoves.length > 0) {
                    bestMove = otherMoves[Math.floor(Math.random() * otherMoves.length)];
                }
            }
        }
        
        this.aiBestMove = bestMove;
        this.aiThinking = false;
        this.aiSearchState = null;
        
        // Update emotion based on position
        this.updateEmotionFromPosition();
    }
    
    startPlayerEvaluation() {
        // Evaluate all player moves
        const moves = this.generateAllMoves('white');
        this.playerMoveScores = moves.map(move => {
            const savedBoard = this.board.map(row => [...row]);
            const savedCastling = {...this.castling};
            const savedEnPassant = this.enPassant;
            
            this.applyMoveToBoard(move);
            const score = this.evaluatePosition();
            
            this.board = savedBoard;
            this.castling = savedCastling;
            this.enPassant = savedEnPassant;
            
            return { move, score };
        });
        
        this.playerMoveScores.sort((a, b) => b.score - a.score);
    }
    
    evaluatePlayerMove(move) {
        if (this.playerMoveScores.length === 0) return 0;
        
        const bestScore = this.playerMoveScores[0].score;
        const worstScore = this.playerMoveScores[this.playerMoveScores.length - 1].score;
        
        // Find this move's score
        const moveData = this.playerMoveScores.find(m => 
            m.move.from.row === move.from.row &&
            m.move.from.col === move.from.col &&
            m.move.to.row === move.to.row &&
            m.move.to.col === move.to.col
        );
        
        if (!moveData) return 0;
        
        const range = bestScore - worstScore;
        if (range === 0) return 0;
        
        // Normalize to -1 to 1
        return (moveData.score - worstScore) / range * 2 - 1;
    }
    
    updateEmotionFromPosition() {
        const eval_ = this.evaluatePosition();
        
        // Positive = white (player) winning, negative = black (AI) winning
        if (eval_ > 300) {
            this.emotion = EMOTION.AFRAID;
        } else if (eval_ > 100) {
            this.emotion = EMOTION.CONFUSED;
        } else if (eval_ < -300) {
            this.emotion = EMOTION.ANGRY;
        } else if (eval_ < -100) {
            this.emotion = EMOTION.BORED;
        } else {
            this.emotion = EMOTION.NEUTRAL;
        }
        
        // Check if player made unexpected move
        if (this.lastPlayerMoveQuality < -0.5) {
            this.emotion = EMOTION.CONFUSED;
        }
    }
    
    // ========================================================================
    // INPUT HANDLING
    // ========================================================================
    
    handleKey(key, down, event) {
        if (!down) return;
        
        const k = key.toLowerCase();
        
        // Title screen input
        if (this.screen === 'title') {
            if (k === 'arrowup' || k === 'w') {
                this.menuSelection = Math.max(0, this.menuSelection - 1);
            } else if (k === 'arrowdown' || k === 's') {
                this.menuSelection = Math.min(DIFFICULTY_OPTIONS.length - 1, this.menuSelection + 1);
            } else if (k === ' ' || key === 'Enter') {
                this.startGame();
            }
            return;
        }
        
        // Debug toggle (backtick)
        if (key === '`') {
            this.showDebug = !this.showDebug;
            return;
        }
        
        // Restart - go back to title
        if (k === 'r') {
            this.screen = 'title';
            return;
        }
        
        // Game over - any key to go back to title
        if (this.gameOver) {
            if (k === ' ' || key === 'Enter') {
                this.screen = 'title';
            }
            return;
        }
        
        // Don't process input during AI turn or animation
        if (this.turn === 'black' || this.animatingMove) return;
        
        // Cursor movement
        if (k === 'arrowup' || k === 'w') {
            this.cursorRow = Math.min(7, this.cursorRow + 1);
        } else if (k === 'arrowdown' || k === 's') {
            this.cursorRow = Math.max(0, this.cursorRow - 1);
        } else if (k === 'arrowleft' || k === 'a') {
            this.cursorCol = Math.max(0, this.cursorCol - 1);
        } else if (k === 'arrowright' || k === 'd') {
            this.cursorCol = Math.min(7, this.cursorCol + 1);
        }
        
        // Selection
        if (k === ' ' || key === 'Enter') {
            this.handleSelect();
        }
        
        // Deselect
        if (key === 'Escape') {
            this.selectedSquare = null;
            this.legalMoves = [];
        }
    }
    
    handleSelect() {
        const row = this.cursorRow;
        const col = this.cursorCol;
        
        if (this.selectedSquare === null) {
            // First selection - pick a piece
            const piece = this.board[row][col];
            if (this.isPieceColor(piece, 'white')) {
                this.selectedSquare = {row, col};
                this.legalMoves = this.generatePieceMoves(row, col);
            }
        } else {
            // Second selection - try to move
            const move = this.legalMoves.find(m => 
                m.to.row === row && m.to.col === col
            );
            
            if (move) {
                // Valid move - animate and execute
                this.lastPlayerMoveQuality = this.evaluatePlayerMove(move);
                this.startMoveAnimation(move);
            } else if (this.isPieceColor(this.board[row][col], 'white')) {
                // Clicked on another white piece - select it instead
                this.selectedSquare = {row, col};
                this.legalMoves = this.generatePieceMoves(row, col);
            } else {
                // Invalid move - deselect
                this.selectedSquare = null;
                this.legalMoves = [];
            }
        }
    }
    
    startMoveAnimation(move) {
        this.animatingMove = true;
        this.animProgress = 0;
        this.animFrom = move.from;
        this.animTo = move.to;
        this.animPiece = this.board[move.from.row][move.from.col];
        this.animMove = move;
        
        // Temporarily remove piece from board
        this.board[move.from.row][move.from.col] = EMPTY;
    }
    
    finishMoveAnimation() {
        // Restore piece and make the actual move
        this.board[this.animFrom.row][this.animFrom.col] = this.animPiece;
        
        this.makeMove(this.animMove);
        
        this.animatingMove = false;
        this.selectedSquare = null;
        this.legalMoves = [];
        
        // Start AI search if game not over
        if (!this.gameOver && this.turn === 'black') {
            // Play random sorcerer voice line
            this.playRandomSorcererSound();
            this.startAISearch();
        }
    }
    
    playRandomSorcererSound() {
        if (this.sorcererSounds.length === 0) return;
        
        // Pick a random sound that's different from last time
        let idx;
        if (this.sorcererSounds.length === 1) {
            idx = 0;
        } else {
            do {
                idx = Math.floor(Math.random() * this.sorcererSounds.length);
            } while (idx === this.lastSorcererSoundIdx);
        }
        
        this.lastSorcererSoundIdx = idx;
        const sound = this.sorcererSounds[idx];
        sound.currentTime = 0;  // Reset in case already playing
        sound.play().catch(() => {});  // Ignore autoplay errors
    }
    
    // ========================================================================
    // UPDATE
    // ========================================================================
    
    update(deltaTime) {
        // Always update eyes for animation
        this.updateEyes(deltaTime);
        
        // Title screen
        if (this.screen === 'title') {
            this.generateTitleScreen();
            return;
        }
        
        // Update animation
        if (this.animatingMove) {
            this.animProgress += deltaTime * 4;  // Animation speed
            if (this.animProgress >= 1) {
                this.finishMoveAnimation();
            }
        }
        
        // Update AI search
        if (this.aiThinking) {
            this.continueAISearch();
        }
        
        // Execute AI move when ready (minimum 4 second delay)
        const AI_MIN_DELAY_MS = 4000;
        const aiElapsed = performance.now() - this.aiTurnStartTime;
        if (!this.aiThinking && this.aiBestMove && this.turn === 'black' && !this.animatingMove && aiElapsed >= AI_MIN_DELAY_MS) {
            this.startMoveAnimation(this.aiBestMove);
            this.aiBestMove = null;
            
            // After AI move, evaluate player's options
            setTimeout(() => {
                if (this.turn === 'white') {
                    this.startPlayerEvaluation();
                }
            }, 100);
        }
        
        // Generate display segments
        this.generateSegments();
    }
    
    updateEyes(deltaTime) {
        // Blink timer
        this.blinkTimer -= deltaTime;
        if (this.blinkTimer <= 0) {
            if (this.isBlinking) {
                this.isBlinking = false;
                this.blinkTimer = 2 + Math.random() * 5;
            } else {
                this.isBlinking = true;
                this.blinkTimer = 0.15;
            }
        }
        
        // Eye target tracking
        let targetX = 0.5;
        let targetY = 0.5;
        
        if (this.lastMove) {
            // Track last move
            targetX = (this.lastMove.to.col + 0.5) / 8;
            targetY = (this.lastMove.to.row + 0.5) / 8;
        } else if (this.selectedSquare) {
            // Track selected square
            targetX = (this.selectedSquare.col + 0.5) / 8;
            targetY = (this.selectedSquare.row + 0.5) / 8;
        } else {
            // Track cursor
            targetX = (this.cursorCol + 0.5) / 8;
            targetY = (this.cursorRow + 0.5) / 8;
        }
        
        // Smooth pupil movement
        this.eyePupilX += (targetX - this.eyePupilX) * deltaTime * 3;
        this.eyePupilY += (targetY - this.eyePupilY) * deltaTime * 3;
        
        // Confused emotion = darting eyes
        if (this.emotion === EMOTION.CONFUSED) {
            this.eyePupilX += (Math.random() - 0.5) * 0.1;
            this.eyePupilY += (Math.random() - 0.5) * 0.1;
        }
    }
    
    // ========================================================================
    // RENDERING
    // ========================================================================
    
    generateTitleScreen() {
        this.segments = [];
        
        // Draw large sorcerer eyes in center background
        this.drawTitleEyes();
        
        // Title
        this.drawText('CHESS SORCERER', 0.22, 0.88, 0.035);
        
        // Subtitle
        this.drawText('FACE THE DARK WIZARD', 0.25, 0.78, 0.015);
        
        // Difficulty selection - below the eyes
        this.drawText('SELECT DIFFICULTY:', 0.28, 0.42, 0.018);
        
        for (let i = 0; i < DIFFICULTY_OPTIONS.length; i++) {
            const y = 0.34 - i * 0.065;
            const selected = i === this.menuSelection;
            const prefix = selected ? '> ' : '  ';
            const suffix = selected ? ' <' : '';
            this.drawText(prefix + DIFFICULTY_OPTIONS[i] + suffix, 0.35, y, selected ? 0.020 : 0.015);
        }
        
        // Instructions
        this.drawText('UP/DOWN: SELECT   SPACE: START', 0.18, 0.10, 0.012);
        this.drawText('CTRL-C: EXIT', 0.38, 0.05, 0.012);
    }
    
    // AIDEV-NOTE: Drawing functions moved to chess_sorcerer_draw.js
    
    generateSegments() {
        this.segments = [];
        
        // Draw sorcerer eyes FIRST (behind the board)
        this.drawEyes();
        
        // Draw board
        this.drawBoard();
        
        // Draw pieces
        this.drawPieces();
        
        // Draw animated piece
        if (this.animatingMove) {
            this.drawAnimatedPiece();
        }
        
        // Draw cursor and selection
        this.drawCursor();
        
        // Draw legal moves
        this.drawLegalMoves();
        
        // Draw HUD and debug (hide on game over)
        if (!this.gameOver) {
            this.drawHUD();
            
            if (this.showDebug) {
                this.drawDebug();
            }
        }
        
        // Draw game over
        if (this.gameOver) {
            this.drawGameOver();
        }
    }
    
    // Convert board position to screen position with perspective
    // AIDEV-NOTE: Returns corners of a trapezoid square for proper perspective
    boardToScreen(row, col) {
        // Board centered on screen
        const boardCenterX = 0.5;
        const boardBottom = 0.08;
        const boardWidth = 0.65;
        const boardHeight = 0.80;
        
        // Perspective: rows further away are narrower (top of board)
        const perspectiveNear = 1.0;   // Bottom row (close)
        const perspectiveFar = 0.6;    // Top row (far)
        
        // Get scale for this row and next row
        const scale = perspectiveNear + (perspectiveFar - perspectiveNear) * (row / 8);
        const scaleNext = perspectiveNear + (perspectiveFar - perspectiveNear) * ((row + 1) / 8);
        
        const rowHeight = boardHeight / 8;
        
        // Calculate X positions with perspective
        const rowWidth = boardWidth * scale;
        const rowLeft = boardCenterX - rowWidth / 2;
        const colWidth = rowWidth / 8;
        
        const x = rowLeft + col * colWidth;
        const y = boardBottom + row * rowHeight;
        
        return { x, y, width: colWidth, height: rowHeight, scale };
    }
    
    // Get the four corners of a square for proper perspective rendering
    getSquareCorners(row, col) {
        const boardCenterX = 0.5;
        const boardBottom = 0.08;
        const boardWidth = 0.65;
        const boardHeight = 0.80;
        
        const perspectiveNear = 1.0;
        const perspectiveFar = 0.6;
        
        const rowHeight = boardHeight / 8;
        
        // Bottom edge of square (row)
        const scaleBot = perspectiveNear + (perspectiveFar - perspectiveNear) * (row / 8);
        const widthBot = boardWidth * scaleBot;
        const leftBot = boardCenterX - widthBot / 2;
        const colWidthBot = widthBot / 8;
        
        // Top edge of square (row + 1)
        const scaleTop = perspectiveNear + (perspectiveFar - perspectiveNear) * ((row + 1) / 8);
        const widthTop = boardWidth * scaleTop;
        const leftTop = boardCenterX - widthTop / 2;
        const colWidthTop = widthTop / 8;
        
        const yBot = boardBottom + row * rowHeight;
        const yTop = boardBottom + (row + 1) * rowHeight;
        
        return {
            bl: { x: leftBot + col * colWidthBot, y: yBot },
            br: { x: leftBot + (col + 1) * colWidthBot, y: yBot },
            tl: { x: leftTop + col * colWidthTop, y: yTop },
            tr: { x: leftTop + (col + 1) * colWidthTop, y: yTop }
        };
    }
    
    // Drawing functions are in chess_sorcerer_draw.js and added to prototype
    
    drawText(text, x, y, size = 0.015) {
        const charWidth = size;
        const charHeight = size * 1.3;
        let cx = x;
        
        for (const char of text.toString()) {
            const charLines = getCharacterLines(char);
            for (const seg of charLines) {
                this.segments.push([
                    cx + seg[0] * charWidth,
                    y + seg[1] * charHeight,
                    cx + seg[2] * charWidth,
                    y + seg[3] * charHeight
                ]);
            }
            cx += charWidth * 1.1;
        }
    }
    
    getSegments() {
        return this.segments;
    }
}

// Global instance
const chessSorcererGame = new ChessSorcererGame();

