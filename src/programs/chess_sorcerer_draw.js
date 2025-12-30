// CHESS SORCERER - Drawing functions
// AIDEV-NOTE: Separated drawing code for maintainability
// These functions are added to ChessSorcererGame.prototype

(function() {
    'use strict';
    
    // ========================================================================
    // PIECE SHAPE FUNCTIONS
    // ========================================================================
    
    ChessSorcererGame.prototype.getKingShape = function(cx, cy, size, isWhite) {
        const s = [];
        const h = size * 1.3;
        const w = size * 0.9;
        
        // Wide flared base
        s.push([cx - w * 1.1, cy - h * 0.9, cx + w * 1.1, cy - h * 0.9]);
        s.push([cx - w * 1.1, cy - h * 0.9, cx - w * 0.9, cy - h * 0.7]);
        s.push([cx + w * 1.1, cy - h * 0.9, cx + w * 0.9, cy - h * 0.7]);
        
        // Body narrowing up
        s.push([cx - w * 0.9, cy - h * 0.7, cx - w * 0.5, cy + h * 0.1]);
        s.push([cx + w * 0.9, cy - h * 0.7, cx + w * 0.5, cy + h * 0.1]);
        
        // Crown band
        s.push([cx - w * 0.6, cy + h * 0.1, cx + w * 0.6, cy + h * 0.1]);
        s.push([cx - w * 0.5, cy + h * 0.2, cx + w * 0.5, cy + h * 0.2]);
        
        // Large prominent cross
        s.push([cx - w * 0.5, cy + h * 0.2, cx - w * 0.15, cy + h * 0.2]);
        s.push([cx + w * 0.5, cy + h * 0.2, cx + w * 0.15, cy + h * 0.2]);
        s.push([cx - w * 0.15, cy + h * 0.2, cx - w * 0.15, cy + h * 0.45]);
        s.push([cx + w * 0.15, cy + h * 0.2, cx + w * 0.15, cy + h * 0.45]);
        s.push([cx - w * 0.4, cy + h * 0.45, cx + w * 0.4, cy + h * 0.45]);
        s.push([cx - w * 0.4, cy + h * 0.45, cx - w * 0.4, cy + h * 0.6]);
        s.push([cx + w * 0.4, cy + h * 0.45, cx + w * 0.4, cy + h * 0.6]);
        s.push([cx - w * 0.4, cy + h * 0.6, cx - w * 0.15, cy + h * 0.6]);
        s.push([cx + w * 0.4, cy + h * 0.6, cx + w * 0.15, cy + h * 0.6]);
        s.push([cx - w * 0.15, cy + h * 0.6, cx - w * 0.15, cy + h * 0.9]);
        s.push([cx + w * 0.15, cy + h * 0.6, cx + w * 0.15, cy + h * 0.9]);
        s.push([cx - w * 0.15, cy + h * 0.9, cx + w * 0.15, cy + h * 0.9]);
        
        return s;
    };
    
    ChessSorcererGame.prototype.getQueenShape = function(cx, cy, size, isWhite) {
        const s = [];
        const h = size * 1.3;
        const w = size * 0.9;
        
        // Wide flared base
        s.push([cx - w * 1.1, cy - h * 0.9, cx + w * 1.1, cy - h * 0.9]);
        s.push([cx - w * 1.1, cy - h * 0.9, cx - w * 0.9, cy - h * 0.7]);
        s.push([cx + w * 1.1, cy - h * 0.9, cx + w * 0.9, cy - h * 0.7]);
        
        // Body narrowing up
        s.push([cx - w * 0.9, cy - h * 0.7, cx - w * 0.55, cy + h * 0.05]);
        s.push([cx + w * 0.9, cy - h * 0.7, cx + w * 0.55, cy + h * 0.05]);
        
        // Crown band
        s.push([cx - w * 0.65, cy + h * 0.05, cx + w * 0.65, cy + h * 0.05]);
        
        // Dramatic 5-point crown with balls on top
        s.push([cx - w * 0.65, cy + h * 0.05, cx - w * 0.9, cy + h * 0.55]);
        s.push([cx - w * 0.9, cy + h * 0.55, cx - w * 0.45, cy + h * 0.25]);
        s.push([cx - w * 0.45, cy + h * 0.25, cx - w * 0.55, cy + h * 0.7]);
        s.push([cx - w * 0.55, cy + h * 0.7, cx, cy + h * 0.35]);
        s.push([cx, cy + h * 0.35, cx + w * 0.55, cy + h * 0.7]);
        s.push([cx + w * 0.55, cy + h * 0.7, cx + w * 0.45, cy + h * 0.25]);
        s.push([cx + w * 0.45, cy + h * 0.25, cx + w * 0.9, cy + h * 0.55]);
        s.push([cx + w * 0.9, cy + h * 0.55, cx + w * 0.65, cy + h * 0.05]);
        
        // Ball on top center
        const ballR = w * 0.12;
        const ballY = cy + h * 0.45;
        this.addCircleSegments(s, cx, ballY, ballR, 6);
        
        return s;
    };
    
    ChessSorcererGame.prototype.addCircleSegments = function(segments, cx, cy, r, numSegs) {
        for (let i = 0; i < numSegs; i++) {
            const a1 = (i / numSegs) * Math.PI * 2;
            const a2 = ((i + 1) / numSegs) * Math.PI * 2;
            segments.push([
                cx + Math.cos(a1) * r, cy + Math.sin(a1) * r,
                cx + Math.cos(a2) * r, cy + Math.sin(a2) * r
            ]);
        }
    };
    
    ChessSorcererGame.prototype.getRookShape = function(cx, cy, size, isWhite) {
        const s = [];
        const h = size * 1.2;
        const w = size * 0.85;
        
        // Wide flared base
        s.push([cx - w * 1.1, cy - h * 0.85, cx + w * 1.1, cy - h * 0.85]);
        s.push([cx - w * 1.1, cy - h * 0.85, cx - w * 0.95, cy - h * 0.65]);
        s.push([cx + w * 1.1, cy - h * 0.85, cx + w * 0.95, cy - h * 0.65]);
        
        // Straight tower body
        s.push([cx - w * 0.95, cy - h * 0.65, cx - w * 0.8, cy - h * 0.65]);
        s.push([cx + w * 0.95, cy - h * 0.65, cx + w * 0.8, cy - h * 0.65]);
        s.push([cx - w * 0.8, cy - h * 0.65, cx - w * 0.8, cy + h * 0.35]);
        s.push([cx + w * 0.8, cy - h * 0.65, cx + w * 0.8, cy + h * 0.35]);
        
        // Bold crenellations (3 merlons)
        s.push([cx - w * 0.8, cy + h * 0.35, cx - w * 0.8, cy + h * 0.75]);
        s.push([cx - w * 0.8, cy + h * 0.75, cx - w * 0.5, cy + h * 0.75]);
        s.push([cx - w * 0.5, cy + h * 0.75, cx - w * 0.5, cy + h * 0.45]);
        s.push([cx - w * 0.5, cy + h * 0.45, cx - w * 0.2, cy + h * 0.45]);
        s.push([cx - w * 0.2, cy + h * 0.45, cx - w * 0.2, cy + h * 0.75]);
        s.push([cx - w * 0.2, cy + h * 0.75, cx + w * 0.2, cy + h * 0.75]);
        s.push([cx + w * 0.2, cy + h * 0.75, cx + w * 0.2, cy + h * 0.45]);
        s.push([cx + w * 0.2, cy + h * 0.45, cx + w * 0.5, cy + h * 0.45]);
        s.push([cx + w * 0.5, cy + h * 0.45, cx + w * 0.5, cy + h * 0.75]);
        s.push([cx + w * 0.5, cy + h * 0.75, cx + w * 0.8, cy + h * 0.75]);
        s.push([cx + w * 0.8, cy + h * 0.75, cx + w * 0.8, cy + h * 0.35]);
        
        // Connect top
        s.push([cx - w * 0.8, cy + h * 0.35, cx + w * 0.8, cy + h * 0.35]);
        
        return s;
    };
    
    ChessSorcererGame.prototype.getBishopShape = function(cx, cy, size, isWhite) {
        const s = [];
        const h = size * 1.3;
        const w = size * 0.75;
        
        // Wide flared base
        s.push([cx - w * 1.1, cy - h * 0.85, cx + w * 1.1, cy - h * 0.85]);
        s.push([cx - w * 1.1, cy - h * 0.85, cx - w * 0.85, cy - h * 0.6]);
        s.push([cx + w * 1.1, cy - h * 0.85, cx + w * 0.85, cy - h * 0.6]);
        
        // Collar
        s.push([cx - w * 0.85, cy - h * 0.6, cx - w * 0.7, cy - h * 0.5]);
        s.push([cx + w * 0.85, cy - h * 0.6, cx + w * 0.7, cy - h * 0.5]);
        
        // Curved body narrowing to mitre
        s.push([cx - w * 0.7, cy - h * 0.5, cx - w * 0.55, cy - h * 0.1]);
        s.push([cx + w * 0.7, cy - h * 0.5, cx + w * 0.55, cy - h * 0.1]);
        s.push([cx - w * 0.55, cy - h * 0.1, cx - w * 0.4, cy + h * 0.2]);
        s.push([cx + w * 0.55, cy - h * 0.1, cx + w * 0.4, cy + h * 0.2]);
        
        // AIDEV-NOTE: Bishop mitre with actual cut-out slit
        // Left side of mitre - goes up to the slit, then cuts in
        s.push([cx - w * 0.4, cy + h * 0.2, cx - w * 0.3, cy + h * 0.38]);
        // Slit cut - left edge going into the gap
        s.push([cx - w * 0.3, cy + h * 0.38, cx - w * 0.08, cy + h * 0.15]);
        // Slit cut - right edge coming out of the gap  
        s.push([cx + w * 0.08, cy + h * 0.22, cx + w * 0.22, cy + h * 0.42]);
        // Right side of mitre continues up
        s.push([cx + w * 0.4, cy + h * 0.2, cx + w * 0.22, cy + h * 0.42]);
        
        // Top of mitre (two separate points meeting at top)
        s.push([cx - w * 0.3, cy + h * 0.38, cx - w * 0.18, cy + h * 0.58]);
        s.push([cx - w * 0.18, cy + h * 0.58, cx, cy + h * 0.85]);
        s.push([cx + w * 0.22, cy + h * 0.42, cx + w * 0.12, cy + h * 0.60]);
        s.push([cx + w * 0.12, cy + h * 0.60, cx, cy + h * 0.85]);
        
        return s;
    };
    
    ChessSorcererGame.prototype.getKnightShape = function(cx, cy, size, isWhite) {
        const s = [];
        const h = size * 1.4;
        const w = size * 0.85;
        
        // Wide flared base
        s.push([cx - w * 0.85, cy - h * 0.85, cx + w * 0.6, cy - h * 0.85]);
        s.push([cx - w * 0.85, cy - h * 0.85, cx - w * 0.65, cy - h * 0.6]);
        s.push([cx + w * 0.6, cy - h * 0.85, cx + w * 0.45, cy - h * 0.55]);
        
        // Elegant curved neck (skinnier, more curved - left side)
        s.push([cx - w * 0.65, cy - h * 0.6, cx - w * 0.55, cy - h * 0.35]);
        s.push([cx - w * 0.55, cy - h * 0.35, cx - w * 0.40, cy - h * 0.05]);
        s.push([cx - w * 0.40, cy - h * 0.05, cx - w * 0.25, cy + h * 0.25]);
        s.push([cx - w * 0.25, cy + h * 0.25, cx - w * 0.10, cy + h * 0.50]);
        
        // Top of mane flowing into head
        s.push([cx - w * 0.10, cy + h * 0.50, cx + w * 0.15, cy + h * 0.72]);
        
        // Top of head to forehead
        s.push([cx + w * 0.15, cy + h * 0.72, cx + w * 0.40, cy + h * 0.68]);
        s.push([cx + w * 0.40, cy + h * 0.68, cx + w * 0.52, cy + h * 0.55]);
        
        // Long snout extending forward
        s.push([cx + w * 0.52, cy + h * 0.55, cx + w * 1.0, cy + h * 0.42]);
        s.push([cx + w * 1.0, cy + h * 0.42, cx + w * 0.95, cy + h * 0.22]);
        
        // Under jaw curving back - skinnier throat
        s.push([cx + w * 0.95, cy + h * 0.22, cx + w * 0.60, cy + h * 0.10]);
        s.push([cx + w * 0.60, cy + h * 0.10, cx + w * 0.35, cy - h * 0.10]);
        s.push([cx + w * 0.35, cy - h * 0.10, cx + w * 0.45, cy - h * 0.55]);
        
        // Pointed ear
        s.push([cx + w * 0.0, cy + h * 0.55, cx + w * 0.12, cy + h * 0.88]);
        s.push([cx + w * 0.12, cy + h * 0.88, cx + w * 0.28, cy + h * 0.62]);
        
        // Eye (small cross)
        s.push([cx + w * 0.38, cy + h * 0.50, cx + w * 0.48, cy + h * 0.50]);
        s.push([cx + w * 0.43, cy + h * 0.45, cx + w * 0.43, cy + h * 0.55]);
        
        // Nostril
        s.push([cx + w * 0.82, cy + h * 0.30, cx + w * 0.88, cy + h * 0.28]);
        
        // Mane detail lines on neck
        s.push([cx - w * 0.45, cy - h * 0.20, cx - w * 0.30, cy + h * 0.05]);
        s.push([cx - w * 0.30, cy + h * 0.10, cx - w * 0.12, cy + h * 0.38]);
        
        return s;
    };
    
    ChessSorcererGame.prototype.getPawnShape = function(cx, cy, size, isWhite) {
        const s = [];
        const h = size * 1.1;
        const w = size * 0.65;
        
        // Wide flared base
        s.push([cx - w * 1.1, cy - h * 0.8, cx + w * 1.1, cy - h * 0.8]);
        s.push([cx - w * 1.1, cy - h * 0.8, cx - w * 0.85, cy - h * 0.55]);
        s.push([cx + w * 1.1, cy - h * 0.8, cx + w * 0.85, cy - h * 0.55]);
        
        // Collar detail
        s.push([cx - w * 0.85, cy - h * 0.55, cx - w * 0.65, cy - h * 0.45]);
        s.push([cx + w * 0.85, cy - h * 0.55, cx + w * 0.65, cy - h * 0.45]);
        
        // Narrow neck
        s.push([cx - w * 0.65, cy - h * 0.45, cx - w * 0.4, cy - h * 0.1]);
        s.push([cx + w * 0.65, cy - h * 0.45, cx + w * 0.4, cy - h * 0.1]);
        
        // Round head (octagon approximation)
        const headY = cy + h * 0.25;
        const headR = w * 0.75;
        s.push([cx - w * 0.4, cy - h * 0.1, cx - headR, headY - headR * 0.3]);
        s.push([cx - headR, headY - headR * 0.3, cx - headR * 0.8, headY + headR * 0.5]);
        s.push([cx - headR * 0.8, headY + headR * 0.5, cx - headR * 0.4, headY + headR * 0.8]);
        s.push([cx - headR * 0.4, headY + headR * 0.8, cx + headR * 0.4, headY + headR * 0.8]);
        s.push([cx + headR * 0.4, headY + headR * 0.8, cx + headR * 0.8, headY + headR * 0.5]);
        s.push([cx + headR * 0.8, headY + headR * 0.5, cx + headR, headY - headR * 0.3]);
        s.push([cx + headR, headY - headR * 0.3, cx + w * 0.4, cy - h * 0.1]);
        
        return s;
    };
    
    // ========================================================================
    // PIECE FILL FUNCTIONS - Custom horizontal lines per piece
    // ========================================================================
    
    ChessSorcererGame.prototype.drawPieceFill = function(pieceType, cx, cy, size) {
        // AIDEV-NOTE: Custom horizontal line fills per piece type for filled (white/player) pieces
        switch (pieceType) {
            case 'K': this.fillKing(cx, cy, size); break;
            case 'Q': this.fillQueen(cx, cy, size); break;
            case 'R': this.fillRook(cx, cy, size); break;
            case 'B': this.fillBishop(cx, cy, size); break;
            case 'N': this.fillKnight(cx, cy, size); break;
            case 'P': this.fillPawn(cx, cy, size); break;
        }
    };
    
    ChessSorcererGame.prototype.fillKing = function(cx, cy, size) {
        const h = size * 1.3;
        const w = size * 0.9;
        
        // Horizontal lines in body area - width varies by height
        const numLines = 8;
        for (let i = 0; i < numLines; i++) {
            const t = (i + 0.5) / numLines;
            const y = cy - h * 0.85 + t * h * 1.0;  // From base to crown band
            // Width narrows as we go up (tapered body)
            const widthFactor = 1.0 - t * 0.4;
            const halfW = w * 0.85 * widthFactor;
            this.segments.push([cx - halfW, y, cx + halfW, y]);
        }
        // Cross fill - horizontal lines in cross
        this.segments.push([cx - w * 0.35, cy + h * 0.5, cx + w * 0.35, cy + h * 0.5]);
        this.segments.push([cx - w * 0.12, cy + h * 0.7, cx + w * 0.12, cy + h * 0.7]);
    };
    
    ChessSorcererGame.prototype.fillQueen = function(cx, cy, size) {
        const h = size * 1.3;
        const w = size * 0.9;
        
        // Horizontal lines - width varies (tapered body)
        const numLines = 8;
        for (let i = 0; i < numLines; i++) {
            const t = (i + 0.5) / numLines;
            const y = cy - h * 0.85 + t * h * 0.95;
            const widthFactor = 1.0 - t * 0.35;
            const halfW = w * 0.9 * widthFactor;
            this.segments.push([cx - halfW, y, cx + halfW, y]);
        }
    };
    
    ChessSorcererGame.prototype.fillRook = function(cx, cy, size) {
        const h = size * 1.2;
        const w = size * 0.85;
        
        // Horizontal lines - consistent width for tower body
        const numLines = 7;
        for (let i = 0; i < numLines; i++) {
            const t = (i + 0.5) / numLines;
            const y = cy - h * 0.8 + t * h * 1.1;
            const halfW = w * 0.7;
            this.segments.push([cx - halfW, y, cx + halfW, y]);
        }
    };
    
    ChessSorcererGame.prototype.fillBishop = function(cx, cy, size) {
        const h = size * 1.3;
        const w = size * 0.75;
        
        // Horizontal lines - width tapers toward top (mitre shape)
        const numLines = 8;
        for (let i = 0; i < numLines; i++) {
            const t = (i + 0.5) / numLines;
            const y = cy - h * 0.8 + t * h * 0.95;
            // More dramatic taper for bishop
            const widthFactor = 1.0 - t * 0.6;
            const halfW = w * 0.85 * widthFactor;
            if (halfW > 0.002) {
                this.segments.push([cx - halfW, y, cx + halfW, y]);
            }
        }
    };
    
    ChessSorcererGame.prototype.fillKnight = function(cx, cy, size) {
        const h = size * 1.4;
        const w = size * 0.85;
        
        // AIDEV-NOTE: Knight fill uses explicit left/right edge coordinates
        // Based on the actual knight outline shape
        // Format: [y_offset, left_x_offset, right_x_offset] (all as multipliers of h/w)
        const fillRows = [
            // y (h mult), left (w mult), right (w mult)
            [-0.80, -0.75, 0.50],   // Base - wide
            [-0.60, -0.60, 0.42],   // Above base
            [-0.35, -0.50, 0.38],   // Lower neck / lower chest
            [-0.10, -0.38, 0.32],   // Mid neck / inner throat
            [0.10,  -0.30, 0.45],   // Upper neck / jaw start
            [0.30,  -0.22, 0.55],   // Near head / jaw
            [0.50,  -0.08, 0.48],   // Head level / forehead
            [0.65,   0.05, 0.38],   // Top of head
        ];
        
        for (const [yMult, leftMult, rightMult] of fillRows) {
            const y = cy + h * yMult;
            const leftX = cx + w * leftMult;
            const rightX = cx + w * rightMult;
            this.segments.push([leftX, y, rightX, y]);
        }
    };
    
    ChessSorcererGame.prototype.fillPawn = function(cx, cy, size) {
        const h = size * 1.1;
        const w = size * 0.65;
        
        // AIDEV-NOTE: Pawn fill using explicit coordinates based on shape
        // Pawn shape: wide base -> collar -> narrow stem -> round head
        // Head center is at cy + h * 0.25, radius is w * 0.75
        const headY = h * 0.25;
        const headR = w * 0.75;
        
        // Format: [y_offset (h mult), half_width (w mult)]
        const fillRows = [
            // Base area
            [-0.75, 0.95],   // Bottom of base
            [-0.60, 0.75],   // Upper base
            // Collar/stem area  
            [-0.45, 0.55],   // Collar
            [-0.30, 0.38],   // Upper collar into stem
            [-0.10, 0.35],   // Stem (narrowest)
            // Head area - follows round shape
            [0.05,  0.50],   // Bottom of head (widens)
            [0.20,  0.65],   // Lower-mid head
            [0.35,  0.70],   // Mid head (widest)
            [0.50,  0.60],   // Upper-mid head
            [0.65,  0.35],   // Near top of head (narrowing)
        ];
        
        for (const [yMult, halfWMult] of fillRows) {
            const y = cy + h * yMult;
            const halfW = w * halfWMult;
            this.segments.push([cx - halfW, y, cx + halfW, y]);
        }
    };
    
    // ========================================================================
    // BOARD DRAWING
    // ========================================================================
    
    ChessSorcererGame.prototype.drawBoard = function() {
        // Draw board squares with proper perspective
        // AIDEV-NOTE: Dark squares get full fill, occupied squares get subtle corner hints
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const c = this.getSquareCorners(row, col);
                const isLight = (row + col) % 2 === 0;
                const hasPiece = this.board[row][col] !== EMPTY;
                
                // Check if this is the animated piece's destination
                const isAnimDest = this.animatingMove && 
                    this.animTo.row === row && this.animTo.col === col;
                
                // Draw square outline (trapezoid shape)
                this.segments.push([c.bl.x, c.bl.y, c.br.x, c.br.y]);  // Bottom
                this.segments.push([c.br.x, c.br.y, c.tr.x, c.tr.y]);  // Right
                this.segments.push([c.tr.x, c.tr.y, c.tl.x, c.tl.y]);  // Top
                this.segments.push([c.tl.x, c.tl.y, c.bl.x, c.bl.y]);  // Left
                
                // Fill dark squares with VERTICAL lines
                if (!isLight) {
                    if (!hasPiece && !isAnimDest) {
                        // Full fill - vertical lines from bottom to top edge
                        const numLines = 6;
                        for (let i = 0; i < numLines; i++) {
                            const t = (i + 0.5) / numLines;
                            // Interpolate along bottom and top edges
                            const botX = c.bl.x + (c.br.x - c.bl.x) * t;
                            const botY = c.bl.y + (c.br.y - c.bl.y) * t;
                            const topX = c.tl.x + (c.tr.x - c.tl.x) * t;
                            const topY = c.tl.y + (c.tr.y - c.tl.y) * t;
                            this.segments.push([botX, botY, topX, topY]);
                        }
                    } else {
                        // Occupied square - short vertical lines at top and bottom edges
                        const numLines = 6;
                        const hintHeight = 0.1;  // How far the hint lines extend into square
                        
                        // Bottom edge hints - short vertical lines going up
                        for (let i = 0; i < numLines; i++) {
                            const t = (i + 0.5) / numLines;
                            const botX = c.bl.x + (c.br.x - c.bl.x) * t;
                            const botY = c.bl.y + (c.br.y - c.bl.y) * t;
                            // Calculate where this line would go if it extended to top
                            const topX = c.tl.x + (c.tr.x - c.tl.x) * t;
                            const topY = c.tl.y + (c.tr.y - c.tl.y) * t;
                            // Only draw bottom portion
                            const hintTopX = botX + (topX - botX) * hintHeight;
                            const hintTopY = botY + (topY - botY) * hintHeight;
                            this.segments.push([botX, botY, hintTopX, hintTopY]);
                        }
                        
                        // Top edge hints - short vertical lines going down
                        for (let i = 0; i < numLines; i++) {
                            const t = (i + 0.5) / numLines;
                            const topX = c.tl.x + (c.tr.x - c.tl.x) * t;
                            const topY = c.tl.y + (c.tr.y - c.tl.y) * t;
                            // Calculate where this line would go if it extended to bottom
                            const botX = c.bl.x + (c.br.x - c.bl.x) * t;
                            const botY = c.bl.y + (c.br.y - c.bl.y) * t;
                            // Only draw top portion
                            const hintBotX = topX + (botX - topX) * hintHeight;
                            const hintBotY = topY + (botY - topY) * hintHeight;
                            this.segments.push([topX, topY, hintBotX, hintBotY]);
                        }
                    }
                }
            }
        }
        
        // Draw file labels (a-h)
        for (let col = 0; col < 8; col++) {
            const c = this.getSquareCorners(0, col);
            const cx = (c.bl.x + c.br.x) / 2;
            const label = String.fromCharCode(65 + col);
            this.drawText(label, cx - 0.006, c.bl.y - 0.025, 0.012);
        }
        
        // Draw rank labels (1-8)
        for (let row = 0; row < 8; row++) {
            const c = this.getSquareCorners(row, 0);
            const cy = (c.bl.y + c.tl.y) / 2;
            this.drawText((row + 1).toString(), c.bl.x - 0.035, cy - 0.008, 0.012);
        }
    };
    
    // ========================================================================
    // PIECE DRAWING
    // ========================================================================
    
    ChessSorcererGame.prototype.drawPieces = function() {
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = this.board[row][col];
                if (piece === EMPTY) continue;
                
                // Skip animated piece position
                if (this.animatingMove && 
                    this.animFrom.row === row && this.animFrom.col === col) {
                    continue;
                }
                
                const c = this.getSquareCorners(row, col);
                const cx = (c.bl.x + c.br.x + c.tl.x + c.tr.x) / 4;
                const cy = (c.bl.y + c.br.y + c.tl.y + c.tr.y) / 4;
                const avgWidth = ((c.br.x - c.bl.x) + (c.tr.x - c.tl.x)) / 2;
                const size = avgWidth * 0.38;
                
                const isWhitePiece = this.isWhitePiece(piece);
                
                this.drawPiece(piece.toUpperCase(), cx, cy, size, isWhitePiece);
            }
        }
    };
    
    ChessSorcererGame.prototype.drawAnimatedPiece = function() {
        const t = this.animProgress;
        const fromC = this.getSquareCorners(this.animFrom.row, this.animFrom.col);
        const toC = this.getSquareCorners(this.animTo.row, this.animTo.col);
        
        const fromCx = (fromC.bl.x + fromC.br.x + fromC.tl.x + fromC.tr.x) / 4;
        const fromCy = (fromC.bl.y + fromC.br.y + fromC.tl.y + fromC.tr.y) / 4;
        const toCx = (toC.bl.x + toC.br.x + toC.tl.x + toC.tr.x) / 4;
        const toCy = (toC.bl.y + toC.br.y + toC.tl.y + toC.tr.y) / 4;
        
        const cx = fromCx + (toCx - fromCx) * t;
        const cy = fromCy + (toCy - fromCy) * t;
        const lift = Math.sin(t * Math.PI) * 0.05;
        
        const avgWidth = ((fromC.br.x - fromC.bl.x) + (fromC.tr.x - fromC.tl.x)) / 2;
        const size = avgWidth * 0.38;
        const isWhitePiece = this.isWhitePiece(this.animPiece);
        
        this.drawPiece(this.animPiece.toUpperCase(), cx, cy + lift, size, isWhitePiece);
    };
    
    ChessSorcererGame.prototype.drawPiece = function(pieceType, cx, cy, size, isWhite) {
        // AIDEV-NOTE: WHITE pieces (player) are now FILLED, black pieces are outline only
        const segments = [];
        
        switch (pieceType) {
            case 'K': segments.push(...this.getKingShape(cx, cy, size, isWhite)); break;
            case 'Q': segments.push(...this.getQueenShape(cx, cy, size, isWhite)); break;
            case 'R': segments.push(...this.getRookShape(cx, cy, size, isWhite)); break;
            case 'B': segments.push(...this.getBishopShape(cx, cy, size, isWhite)); break;
            case 'N': segments.push(...this.getKnightShape(cx, cy, size, isWhite)); break;
            case 'P': segments.push(...this.getPawnShape(cx, cy, size, isWhite)); break;
        }
        
        this.segments.push(...segments);
        
        // WHITE pieces (player) get fill - they're in foreground
        if (isWhite) {
            this.drawPieceFill(pieceType, cx, cy, size);
        }
    };
    
    // ========================================================================
    // CURSOR AND SELECTION
    // ========================================================================
    
    ChessSorcererGame.prototype.drawCursor = function() {
        if (this.turn !== 'white' || this.gameOver) return;
        
        const c = this.getSquareCorners(this.cursorRow, this.cursorCol);
        
        // AIDEV-NOTE: Cursor is VERY obvious - corner brackets + interior square + exterior square
        // Always draw (no blinking) so it's always visible
        
        // Corner brackets at the actual square corners
        const lenFrac = 0.3;
        
        const bl_dx = (c.br.x - c.bl.x) * lenFrac;
        const bl_dy = (c.tl.y - c.bl.y) * lenFrac;
        this.segments.push([c.bl.x, c.bl.y, c.bl.x + bl_dx, c.bl.y]);
        this.segments.push([c.bl.x, c.bl.y, c.bl.x, c.bl.y + bl_dy]);
        
        const br_dx = (c.br.x - c.bl.x) * lenFrac;
        const br_dy = (c.tr.y - c.br.y) * lenFrac;
        this.segments.push([c.br.x, c.br.y, c.br.x - br_dx, c.br.y]);
        this.segments.push([c.br.x, c.br.y, c.br.x, c.br.y + br_dy]);
        
        const tl_dx = (c.tr.x - c.tl.x) * lenFrac;
        const tl_dy = (c.tl.y - c.bl.y) * lenFrac;
        this.segments.push([c.tl.x, c.tl.y, c.tl.x + tl_dx, c.tl.y]);
        this.segments.push([c.tl.x, c.tl.y, c.tl.x, c.tl.y - tl_dy]);
        
        const tr_dx = (c.tr.x - c.tl.x) * lenFrac;
        const tr_dy = (c.tr.y - c.br.y) * lenFrac;
        this.segments.push([c.tr.x, c.tr.y, c.tr.x - tr_dx, c.tr.y]);
        this.segments.push([c.tr.x, c.tr.y, c.tr.x, c.tr.y - tr_dy]);
        
        // Interior square (inset by 20%)
        const inset = 0.2;
        const ibl = { 
            x: c.bl.x + (c.br.x - c.bl.x) * inset + (c.tl.x - c.bl.x) * inset,
            y: c.bl.y + (c.br.y - c.bl.y) * inset + (c.tl.y - c.bl.y) * inset
        };
        const ibr = { 
            x: c.br.x - (c.br.x - c.bl.x) * inset + (c.tr.x - c.br.x) * inset,
            y: c.br.y - (c.br.y - c.bl.y) * inset + (c.tr.y - c.br.y) * inset
        };
        const itl = { 
            x: c.tl.x + (c.tr.x - c.tl.x) * inset - (c.tl.x - c.bl.x) * inset,
            y: c.tl.y + (c.tr.y - c.tl.y) * inset - (c.tl.y - c.bl.y) * inset
        };
        const itr = { 
            x: c.tr.x - (c.tr.x - c.tl.x) * inset - (c.tr.x - c.br.x) * inset,
            y: c.tr.y - (c.tr.y - c.tl.y) * inset - (c.tr.y - c.br.y) * inset
        };
        this.segments.push([ibl.x, ibl.y, ibr.x, ibr.y]);
        this.segments.push([ibr.x, ibr.y, itr.x, itr.y]);
        this.segments.push([itr.x, itr.y, itl.x, itl.y]);
        this.segments.push([itl.x, itl.y, ibl.x, ibl.y]);
        
        // Exterior square (outset by 15%)
        const outset = 0.15;
        const obl = { 
            x: c.bl.x - (c.br.x - c.bl.x) * outset - (c.tl.x - c.bl.x) * outset,
            y: c.bl.y - (c.br.y - c.bl.y) * outset - (c.tl.y - c.bl.y) * outset
        };
        const obr = { 
            x: c.br.x + (c.br.x - c.bl.x) * outset - (c.tr.x - c.br.x) * outset,
            y: c.br.y + (c.br.y - c.bl.y) * outset - (c.tr.y - c.br.y) * outset
        };
        const otl = { 
            x: c.tl.x - (c.tr.x - c.tl.x) * outset + (c.tl.x - c.bl.x) * outset,
            y: c.tl.y - (c.tr.y - c.tl.y) * outset + (c.tl.y - c.bl.y) * outset
        };
        const otr = { 
            x: c.tr.x + (c.tr.x - c.tl.x) * outset + (c.tr.x - c.br.x) * outset,
            y: c.tr.y + (c.tr.y - c.tl.y) * outset + (c.tr.y - c.br.y) * outset
        };
        this.segments.push([obl.x, obl.y, obr.x, obr.y]);
        this.segments.push([obr.x, obr.y, otr.x, otr.y]);
        this.segments.push([otr.x, otr.y, otl.x, otl.y]);
        this.segments.push([otl.x, otl.y, obl.x, obl.y]);
    };
    
    ChessSorcererGame.prototype.drawLegalMoves = function() {
        if (this.selectedSquare === null) return;
        
        // Selected piece gets X through it
        const selC = this.getSquareCorners(this.selectedSquare.row, this.selectedSquare.col);
        this.segments.push([selC.bl.x, selC.bl.y, selC.tr.x, selC.tr.y]);
        this.segments.push([selC.br.x, selC.br.y, selC.tl.x, selC.tl.y]);
        
        // Valid move squares get corner brackets pointing inward (negative space)
        for (const move of this.legalMoves) {
            const c = this.getSquareCorners(move.to.row, move.to.col);
            const cx = (c.bl.x + c.br.x + c.tl.x + c.tr.x) / 4;
            const cy = (c.bl.y + c.br.y + c.tl.y + c.tr.y) / 4;
            
            // Size of the corner brackets
            const avgW = ((c.br.x - c.bl.x) + (c.tr.x - c.tl.x)) / 2;
            const avgH = ((c.tl.y - c.bl.y) + (c.tr.y - c.br.y)) / 2;
            const bracketDist = 0.15;  // How far from center
            const armLen = 0.08;       // Length of each arm
            
            const bx = avgW * bracketDist;
            const by = avgH * bracketDist;
            const ax = avgW * armLen;
            const ay = avgH * armLen;
            
            // Four corner brackets pointing at center (like ] [ rotated)
            // Top-left bracket (L shape pointing down-right)
            this.segments.push([cx - bx - ax, cy + by, cx - bx, cy + by]);
            this.segments.push([cx - bx, cy + by, cx - bx, cy + by + ay]);
            
            // Top-right bracket (mirrored L pointing down-left)
            this.segments.push([cx + bx + ax, cy + by, cx + bx, cy + by]);
            this.segments.push([cx + bx, cy + by, cx + bx, cy + by + ay]);
            
            // Bottom-left bracket (upside-down L pointing up-right)
            this.segments.push([cx - bx - ax, cy - by, cx - bx, cy - by]);
            this.segments.push([cx - bx, cy - by, cx - bx, cy - by - ay]);
            
            // Bottom-right bracket (mirrored upside-down L pointing up-left)
            this.segments.push([cx + bx + ax, cy - by, cx + bx, cy - by]);
            this.segments.push([cx + bx, cy - by, cx + bx, cy - by - ay]);
        }
    };
    
    // ========================================================================
    // SORCERER EYES
    // ========================================================================
    
    ChessSorcererGame.prototype.drawEyes = function() {
        const eyeCenterX = 0.5;
        const eyeY = 0.95;        // Moved up from 0.92
        const eyeSpacing = 0.09;  // Closer together from 0.12
        const eyeSize = 0.055;
        
        this.drawSingleEye(eyeCenterX - eyeSpacing, eyeY, eyeSize, -1);
        this.drawSingleEye(eyeCenterX + eyeSpacing, eyeY, eyeSize, 1);
    };
    
    ChessSorcererGame.prototype.drawTitleEyes = function() {
        const eyeY = 0.58;
        const eyeSpacing = 0.18;
        const eyeSize = 0.10;
        
        this.drawSingleEye(0.5 - eyeSpacing, eyeY, eyeSize, -1);
        this.drawSingleEye(0.5 + eyeSpacing, eyeY, eyeSize, 1);
    };
    
    ChessSorcererGame.prototype.drawSingleEye = function(cx, cy, size, side) {
        const pupilOffsetX = (this.eyePupilX - 0.5) * size * 0.4 * side;
        const pupilOffsetY = (this.eyePupilY - 0.5) * size * 0.3;
        
        let lidTop = 0;
        let lidBottom = 0;
        let eyeHeight = size;
        let pupilSize = size * 0.3;
        
        switch (this.emotion) {
            case EMOTION.ANGRY:
                lidTop = size * 0.3;
                eyeHeight = size * 0.7;
                pupilSize = size * 0.25;
                break;
            case EMOTION.BORED:
                lidTop = size * 0.4;
                lidBottom = size * 0.2;
                eyeHeight = size * 0.4;
                pupilSize = size * 0.2;
                break;
            case EMOTION.CONFUSED:
                pupilSize = size * 0.35;
                break;
            case EMOTION.AFRAID:
                pupilSize = size * 0.4;
                eyeHeight = size * 1.1;
                break;
        }
        
        if (this.isBlinking) {
            eyeHeight = size * 0.1;
            lidTop = size * 0.45;
            lidBottom = size * 0.45;
        }
        
        const eyeW = size * 0.8;
        const eyeTop = cy + eyeHeight / 2 - lidTop;
        const eyeBot = cy - eyeHeight / 2 + lidBottom;
        
        // Eye outline
        this.segments.push([cx - eyeW, cy, cx - eyeW * 0.5, eyeTop]);
        this.segments.push([cx - eyeW * 0.5, eyeTop, cx, eyeTop + size * 0.1]);
        this.segments.push([cx, eyeTop + size * 0.1, cx + eyeW * 0.5, eyeTop]);
        this.segments.push([cx + eyeW * 0.5, eyeTop, cx + eyeW, cy]);
        this.segments.push([cx + eyeW, cy, cx + eyeW * 0.5, eyeBot]);
        this.segments.push([cx + eyeW * 0.5, eyeBot, cx, eyeBot - size * 0.05]);
        this.segments.push([cx, eyeBot - size * 0.05, cx - eyeW * 0.5, eyeBot]);
        this.segments.push([cx - eyeW * 0.5, eyeBot, cx - eyeW, cy]);
        
        // Pupil
        if (!this.isBlinking) {
            const pupilX = cx + pupilOffsetX;
            const pupilY = cy + pupilOffsetY;
            const pupilSegs = 8;
            for (let i = 0; i < pupilSegs; i++) {
                const a1 = (i / pupilSegs) * Math.PI * 2;
                const a2 = ((i + 1) / pupilSegs) * Math.PI * 2;
                this.segments.push([
                    pupilX + Math.cos(a1) * pupilSize,
                    pupilY + Math.sin(a1) * pupilSize * 0.8,
                    pupilX + Math.cos(a2) * pupilSize,
                    pupilY + Math.sin(a2) * pupilSize * 0.8
                ]);
            }
            
            // Pupil inner dot
            const dotR = pupilSize * 0.3;
            this.segments.push([pupilX - dotR, pupilY, pupilX + dotR, pupilY]);
            this.segments.push([pupilX, pupilY - dotR * 0.8, pupilX, pupilY + dotR * 0.8]);
        }
        
        // Eyebrow for angry
        if (this.emotion === EMOTION.ANGRY) {
            const browY = eyeTop + size * 0.2;
            const innerX = cx - side * eyeW * 0.3;
            const outerX = cx + side * eyeW * 0.8;
            const innerY = browY - size * 0.1 * side;
            const outerY = browY + size * 0.15 * side;
            this.segments.push([innerX, innerY, outerX, outerY]);
        }
    };
    
    // ========================================================================
    // HUD AND DEBUG
    // ========================================================================
    
    ChessSorcererGame.prototype.drawHUD = function() {
        this.drawText('CHESS SORCERER', 0.03, 0.95, 0.012);
        this.drawText('LEVEL: ' + this.difficulty.name, 0.03, 0.91, 0.010);
        
        const turnText = this.turn === 'white' ? 'YOUR TURN' : 'THINKING...';
        this.drawText(turnText, 0.40, 0.02, 0.015);
        
        if (this.aiThinking) {
            const dots = '.'.repeat(Math.floor(performance.now() / 300) % 4);
            this.drawText(dots, 0.58, 0.02, 0.015);
        }
        
        // Controls legend on RIGHT side - moved up
        this.drawText('CONTROLS', 0.86, 0.88, 0.015);
        this.drawText('ARROWS', 0.86, 0.81, 0.018);
        this.drawText('MOVE', 0.88, 0.76, 0.012);
        this.drawText('SPACE', 0.86, 0.69, 0.018);
        this.drawText('SELECT', 0.87, 0.64, 0.012);
        this.drawText('`', 0.90, 0.57, 0.018);
        this.drawText('DEBUG', 0.87, 0.52, 0.012);
        this.drawText('R', 0.90, 0.45, 0.018);
        this.drawText('MENU', 0.88, 0.40, 0.012);
        
        if (this.moveHistory.length > 0) {
            const lastMove = this.moveHistory[this.moveHistory.length - 1].toUpperCase();
            this.drawText('LAST: ' + lastMove, 0.03, 0.87, 0.010);
        }
    };
    
    ChessSorcererGame.prototype.drawDebug = function() {
        const x = 0.03;
        let y = 0.80;
        const lineHeight = 0.038;
        
        this.drawText('DEBUG', x, y, 0.018);
        y -= lineHeight;
        
        const eval_ = this.evaluatePosition();
        const evalStr = eval_ >= 0 ? '+' + eval_ : eval_.toString();
        this.drawText('EVAL: ' + evalStr, x, y, 0.014);
        y -= lineHeight;
        
        const advText = eval_ > 50 ? 'WHITE+' : eval_ < -50 ? 'BLACK+' : 'EVEN';
        this.drawText('ADV: ' + advText, x, y, 0.014);
        y -= lineHeight;
        
        this.drawText('DEPTH: ' + this.currentSearchDepth, x, y, 0.014);
        y -= lineHeight;
        this.drawText('POS: ' + this.positionsEvaluated, x, y, 0.014);
        y -= lineHeight;
        
        if (this.aiMoveScores.length > 0) {
            this.drawText('AI MOVES:', x, y, 0.014);
            y -= lineHeight;
            
            const showCount = Math.min(3, this.aiMoveScores.length);
            for (let i = 0; i < showCount; i++) {
                const m = this.aiMoveScores[i];
                const moveStr = this.moveToString(m.move).toUpperCase();
                const scoreStr = m.score >= 0 ? '+' + m.score : m.score.toString();
                this.drawText(moveStr + ' ' + scoreStr, x, y, 0.012);
                y -= lineHeight * 0.8;
            }
        }
    };
    
    ChessSorcererGame.prototype.drawGameOver = function() {
        if (this.gameResult === 'white') {
            // PLAYER WINS - Big "YOU WIN" on the left side
            this.drawText('YOU', 0.03, 0.75, 0.035);
            this.drawText('WIN!', 0.03, 0.65, 0.035);
            
            this.drawText(this.gameEndReason.toUpperCase(), 0.03, 0.50, 0.015);
            this.drawText('PRESS SPACE', 0.03, 0.35, 0.012);
            this.drawText('TO CONTINUE', 0.03, 0.30, 0.012);
        } else {
            // SORCERER WINS or DRAW - box in center
            this.segments.push([0.25, 0.35, 0.75, 0.35]);
            this.segments.push([0.75, 0.35, 0.75, 0.65]);
            this.segments.push([0.75, 0.65, 0.25, 0.65]);
            this.segments.push([0.25, 0.65, 0.25, 0.35]);
            
            const resultText = this.gameResult === 'black' ? 'SORCERER WINS!' : 'DRAW';
            this.drawText(resultText, 0.35, 0.55, 0.025);
            this.drawText(this.gameEndReason, 0.32, 0.45, 0.012);
            this.drawText('PRESS SPACE TO CONTINUE', 0.28, 0.38, 0.012);
        }
    };
    
})();

