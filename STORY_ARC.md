# Oscilloscope - Story Arc Design Document

## Design Philosophy

**Mechanics first, story second.**

Define what's FUN to do, then wrap narrative around it. The player experiences everything through the oscilloscope terminal in their stasis pod. Every interaction is mediated through this green phosphor display.

**Every task is a required gate.** No branching choices, no skippable content. Player agency comes from *how* they solve puzzles, not *whether* they engage.

**Small tasks chain into bigger ones.** Each solved puzzle directly enables the next. The game flows as a continuous chain:

```
Small Task → Thing Comes Online → Small Task → Thing Comes Online → Bigger Puzzle → Story Beat → Repeat
```

**Eliza gives small, immediate asks.** Not mission dumps - just "can you do this one thing?" If the player hasn't done the required task, Eliza redirects them.

---

## Story Progression (Phases 1-3)

### Phase 1: Awakening

**Eliza Goal:** `opening` (implemented)

| # | Task | Type | Enables |
|---|------|------|---------|
| 1 | Respond to Eliza's psych assessment | Conversation | Marked as commander |
| 2 | Run SOLAR, align panels | Puzzle | Power to ~3% |
| 3 | *Story beat: You're the Systems Engineer* | | |

**Eliza asks:**
- "Are you okay?"
- "Can you make decisions under pressure?"
- "Power is critical. Run Solar."

**Programs Available:** STATUS, ELIZA, SOLAR

---

### Phase 2: Getting Systems Online

**Eliza Goal:** `bootup`

| # | Task | Type | Enables |
|---|------|------|---------|
| 4 | Run POWER, bring up critical systems | Management | Sensors, life support stable |
| 5 | Allocate power to point defense | Management (POWER) | DEFENSE available |
| 6 | Clear debris blocking antenna (3 pieces) | Action (DEFENSE) | Debris cleared |
| 7 | Turn off point defense, turn on comms | Management (POWER) | Comms online |
| 8 | *Story beat: Strange signal detected* | | |

**Eliza asks:**
- "We have enough power for basic systems. Run POWER."
- "Good. Now bring point defense online - there's debris blocking the comm antenna."
- "Three pieces blocking the antenna. Use DEFENSE to clear them."
- [After debris cleared] "Debris clear. Bring comms online."
- [If player talks to Eliza without enabling comms] "Comms are still offline. Check POWER."
- [After comms enabled] "...I'm picking something up."

**The POWER → DEFENSE → POWER flow:**
- Player enables DEFENSE via POWER
- Does the action task (destroy 3 debris pieces)
- Must return to POWER themselves
- Must turn OFF defense, turn ON comms (budget forces tradeoff)
- If they skip this and talk to Eliza, she redirects them

**Programs Unlocked:** POWER, DEFENSE

---

### Phase 3: First Contact

**Eliza Goal:** `signal`

| # | Task | Type | Enables |
|---|------|------|---------|
| 9 | Analyze incoming signal with ANALYZER | Puzzle | Frequencies identified |
| 10 | Decode the pattern structure | Puzzle | Understand it's a handshake |
| 11 | Compose response using correct frequencies | Puzzle | Response transmitted |
| 12 | *Story beat: They acknowledged us* | | |

**Eliza asks:**
- "I can't make sense of this. You're the engineer - run ANALYZER."
- "Three tones repeating. What are the frequencies?"
- "Can you send those back? Match the pattern."
- "...they responded. We're not alone."

**Programs Unlocked:** ANALYZER (for signal work)

---

## Key Programs (Designed)

### POWER - System Power Management

**Available:** Phase 2 (after solar fix)

**Three Power Tiers:**

| Tier | When Available | Can Toggle? |
|------|----------------|-------------|
| CRITICAL | Always | No - always on |
| LOW POWER | After solar fix (~3%) | Yes - on/off within budget |
| FULL POWER | TBD (design when needed) | Yes - on/off within budget |

**How it works:**
- **Critical systems** are always on, can't be toggled (life support, basic computing)
- **Low Power systems** unlock after solar fix - simple ON/OFF toggle
- **Full Power systems** locked until later (TBD - design when needed)
- **Power budget** limits how many systems you can have ON at once
- Turning something ON might require turning something else OFF

**Interface idea:**

```
═══════════════════════════════════════
         POWER MANAGEMENT
═══════════════════════════════════════
MODE: LOW POWER         BUDGET: 12/20

─── CRITICAL (always on) ──────────────
  LIFE SUPPORT              [LOCKED]
  BASIC COMPUTING           [LOCKED]

─── LOW POWER (12/20 used) ────────────
  SENSORS            ██     [ON ]
  POINT DEFENSE      ███    [OFF]
  COMMS              ██     [ON ]
  EMERGENCY SEALS    █      [OFF]

─── FULL POWER (TBD) ──────────────────
  (design when needed)
═══════════════════════════════════════
    ↑↓ SELECT    ENTER TOGGLE    ESC EXIT
```

---

### DEFENSE - Point Defense System

**Program name:** `DEFENSE`

**Available:** Phase 2 (after POWER brings it online)

**What it does:**
- Lo-fi wireframe 3D point defense targeting
- Display shows debris field around comm antenna
- **3 debris pieces** must be destroyed to clear the area
- Crosshair to aim, fire to destroy
- **Shots take time to reload** - encourages careful aiming

**Gameplay:**
- Player sees 3D wireframe view with debris highlighted
- Aim crosshair at debris, fire
- Miss = wait for reload, try again
- Hit = satisfying destruction, debris count decreases
- Clear all 3 = antenna can deploy

**Eliza integration:**
- Eliza has access to remaining debris count
- Can give feedback: "Two more." / "One left." / "Clear. Deploying antenna."
- Creates natural back-and-forth if player asks "how many left?"

**Visual style:**
- Green wireframe vectors (oscilloscope aesthetic)
- Simple 3D perspective
- Debris highlighted as targets
- Reload indicator (charging bar?)
- Satisfying "hit" feedback

---

## Speculative Future Content (Phases 4-7)

**Note:** These phases are rough outlines. Design details TBD when we reach them.

### Phase 4: Deterioration

**Eliza Goal:** `survival`

- Hull breach alert - reroute power to seal
- Incoming debris - use DEFENSE under pressure
- Power fluctuation - rebalance systems
- *Story beat: Ship is worse than we thought + alien signal changes*

**Reuses POWER and DEFENSE** under crisis conditions.

---

### Phase 5: External Investigation

**Eliza Goal:** `investigation`

- Allocate power to drone bay
- Launch and navigate drone to damage site (DRONE program)
- Discover something unexpected on hull
- Exploit CHESS bug to unlock memory access (see: Knight Underpromotion Exploit)
- Access restricted ship logs (HEXEDIT)
- *Story beat: The damage wasn't an accident*

**New programs:** DRONE, HEXEDIT

**HEXEDIT Unlock Sequence:**
The player needs to access restricted memory to read ship logs, but the system is locked down. Eliza mentions the CHESS program was written by a bored crew member and "probably has bugs." The player must:
1. Play CHESS and reach a position where knight underpromotion is possible
2. Perform the underpromotion (promote pawn to knight instead of queen)
3. This triggers a "memory allocation error" - the CHESS program didn't handle this edge case
4. The error message reveals memory addresses, giving the player a foothold
5. HEXEDIT becomes available - born from exploiting the bug

---

### Phase 6: Establishing Communication

**Eliza Goal:** `contact`

- Decode alien vocabulary patterns
- Build meaningful response (SIGNAL program)
- Receive coordinates from aliens
- Launch probe to coordinates (PROBE orbital mechanics)
- *Story beat: They're guiding us somewhere*

**New programs:** SIGNAL, PROBE

---

### Phase 7: Climax

**Eliza Goal:** `endgame`

- Multi-system crisis - everything at once
- Final navigation/broadcast using all learned skills
- *Story beat: Why they contacted us, resolution*

**Tests mastery of all mechanics.**

---

## Core Gameplay Mechanics

### 1. Alien Communication Puzzle

**The idea:** Get a message and figure out what it means. Maybe through a code, or a back-and-forth where both parties learn to communicate.

**What we know:**
- Alien presence is ambiguous - unclear if friend or foe until late game
- Communication should involve decoding/figuring out meaning
- Could be pattern-based, could be back-and-forth learning

**Needs more design work** - we didn't dig into what makes this actually fun to play moment-to-moment.

---

### 2. Parametric Curve Drawing (Lissajous Targeting)

**The fun:** Tweaking knobs, immediate visual feedback, threading the needle

**Core Loop:**
- See target points (must hit) and hazard zones (must avoid)
- Adjust parameters: frequency, amplitude, phase, offset
- Watch the curve morph in real-time
- When satisfied, commit/execute
- Curve traces through - did you hit all targets and avoid hazards?

**Implementation Ideas:**
- X-Y oscilloscope mode with Lissajous figures
- Arrow keys adjust different parameters
- Green dots = targets (must pass through)
- Red zones = hazards (must avoid)
- The math is real: `x = A*sin(a*t + δ)`, `y = B*sin(b*t)`

**Uses:**
- Probe trajectory planning
- Signal routing through relay nodes
- System calibration patterns
- Targeting systems

**What makes it satisfying:**
- Immediate visual feedback as you tweak
- The precision of threading through a tight gap
- Understanding how parameters affect the shape

---

### 3. Remote Drone EVA

**The fun:** Spatial disorientation, navigating with a "wrong" reference frame

**Core Loop:**
- Deploy drone outside the ship
- See wireframe/vector view from drone's perspective
- Controls are relative to... the ship? The drone? Disorienting.
- Navigate to objective while managing battery/tether
- Complete task (inspect, retrieve, repair)
- Return before power runs out

**Implementation Ideas:**
- External camera means your left might be drone's right
- Wireframe rendering fits oscilloscope aesthetic
- Limited visibility - can only see what's in front of drone
- Battery drains continuously, faster when moving
- Tether has max range - go too far and you're stuck

**Tasks:**
- Inspect hull damage (discover something unexpected?)
- Retrieve objects from outside
- Make physical repairs
- Set up external sensors/cameras

**What makes it satisfying:**
- Mastering the disorienting controls
- The tension of limited battery
- Discovering something unexpected outside (horror element)

---

### 4. Orbital Mechanics (Probe Launch)

**The fun:** "Golf shot" feel - set up, commit, watch it play out

**Core Loop:**
- See the orbital map (planet, gravity wells, target)
- Set launch angle and initial velocity
- Commit and launch
- Watch probe trajectory unfold - gravity bends the path
- Did you hit the target? If not, adjust and try again
- Fewer launches = better (golf scoring)

**Implementation Ideas:**
- 2D orbital view on oscilloscope
- Gravity wells visualized as gradient or contour lines
- Trajectory prediction line (dotted) before launch
- Actual trajectory traces after launch
- Slingshot maneuvers around gravity wells

**Targets:**
- Debris to investigate
- Other vessels/stations
- Planetary bodies
- Specific coordinates from alien communication

**What makes it satisfying:**
- Nailing a gravity slingshot on first try
- The anticipation while watching trajectory unfold
- Improving your "score" (fewer launches)

---

### 5. Memory Hacking / Code Injection

**The fun:** Feeling like a real hacker, being clever, meta-gaming

#### Part A: The Memory Hunt

**Core Loop:**
1. You know a value exists somewhere in memory (e.g., your score is 500)
2. Search memory for "500" - get many matches (say, 200 addresses)
3. Do something that changes the value (play more, score becomes 750)
4. Search again for "750" within those 200 addresses
5. Matches narrow down (now 12 addresses)
6. Repeat until you find THE address
7. Now you can read/modify/redirect that value

**Implementation Ideas:**
- HEXEDIT or MEMSCAN program
- Shows scrolling hex dump
- Highlight matching values during search
- Track "candidate" addresses across searches
- Visualize memory map showing program regions

#### Part B: Cross-Program Linking

Once you find addresses, you can redirect pointers:
- "System X reads timeout value from address 0x4A2F"
- You discover 0x4A2F is inside ROCKS memory space
- You redirect: "Now read from ROCKS high score instead"
- To set the timeout, you must achieve a specific ROCKS score

#### The Game Value Toolkit

Each existing game produces different types of values:

| Need This | Use This Game | How |
|-----------|---------------|-----|
| Large numbers (100-99999) | ROCKS | Achieve specific score |
| Text strings / sequences | MOONTAXI | Deliver to platforms in order (A→B→D = "ABD") |
| Small integers (1-4) | CHESS | Set difficulty level |

**Example Puzzle:**
To unlock a door, you need:
- Access level = 3 → Set CHESS difficulty to HARD
- Auth code = "CAB" → MOONTAXI: deliver to C, then A, then B
- Timeout = 5000ms → Get exactly 5000 points in ROCKS

**What makes it satisfying:**
- Feels like REAL hacking, not movie hacking
- The hunt is satisfying (narrowing down candidates)
- Gives PURPOSE to arcade games - they're tools now
- Precision challenge (exactly 5000 points, not 5001)
- Feeling smarter than the system

---

### 5b. Knight Underpromotion Exploit (HEXEDIT Unlock)

**The fun:** Discovering a "real" exploit, exploiting developer oversight, meta-gaming

**The Setup:**
You need to access restricted ship memory to read classified logs, but the system won't let you. Eliza mentions the CHESS program was hastily written by a bored crew member during the voyage - "probably full of bugs, honestly." This is the hint.

**The Puzzle:**
Most chess programs don't properly handle pawn underpromotion (promoting to knight, rook, or bishop instead of queen). In this game's fictional universe, the lazy programmer didn't implement it at all - they assumed players would always pick queen.

**Core Loop:**
1. Play CHESS until you can promote a pawn
2. Notice promotion only offers Queen (the "bug")
3. Try to select Knight anyway (cycle through options, or press 'N')
4. The game attempts to allocate memory for a piece type that doesn't exist
5. MEMORY ALLOCATION FAULT displays with scrolling hex
6. The error dump accidentally reveals system memory addresses
7. HEXEDIT program becomes available - "Access granted through fault handler"

**Why Knight Specifically:**
- Knight underpromotion is the most common "real" underpromotion in actual chess
- In some positions, knight promotion gives immediate checkmate (Queen can't do that)
- It rewards players who actually know chess strategy
- If player doesn't know about underpromotion, Eliza can hint: "The Sorcerer never expected anyone to want anything less than a Queen..."

**The Fake Memory Leak:**
When the exploit triggers:
```
═══════════════════════════════════════
    CHESS v2.1 - CRITICAL ERROR
═══════════════════════════════════════
PIECE_TYPE: 0x07 (UNDEFINED)
ATTEMPTING ALLOCATION AT: 0x7F3A...

STACK TRACE:
  promote_pawn() +0x4A
  handle_move() +0x1C2
  >>> FAULT: NO HANDLER FOR TYPE 0x07

DUMPING ADJACENT MEMORY...
  0x7F38: 43 4F 4D 4D  [COMM]
  0x7F3C: 4C 4F 47 53  [LOGS]
  0x7F40: 52 45 53 54  [REST]
  0x7F44: 52 49 43 54  [RICT]

FAULT HANDLER GRANTING DEBUG ACCESS...
>>> NEW PROGRAM AVAILABLE: HEXEDIT
═══════════════════════════════════════
```

**What makes it satisfying:**
- Feels like discovering a REAL exploit
- Rewards chess knowledge (or Eliza hints for others)
- The crash dump looks authentically technical
- Gives narrative reason for why hacking tools exist
- Player earns access through cleverness, not just progression
- The memory dump teases "RESTRICTED COMM LOGS" - immediate motivation to use HEXEDIT

---

### 6. Power Routing (Original Brainstorm)

**The fun:** Resource puzzle, trade-offs, making hard choices

**Core Loop:**
- See total power available (e.g., 100 units)
- See systems and their power needs/current allocation
- Slide power between systems
- Some systems need minimum to function (below = offline)
- More power = better performance, but something else suffers

**Implementation Ideas:**
- Power bars for each system
- Sliders or +/- controls to adjust allocation
- Systems go red/warning when underpowered
- Some systems are critical (life support), some optional (games)
- Total must not exceed available power

**Systems competing for power:**
- Life Support (critical - minimum required to stay alive)
- Communications (needed to talk to alien)
- Sensors (needed for probes, navigation)
- Drone (needed for EVA)
- Computing (needed for hacking tools)
- Engines (needed for navigation maneuvers)

**Trade-off scenarios:**
- "I need to boost comms to send this message, but sensors will go offline"
- "Drone needs 20 units, but I'm at 95/100 with life support at minimum"
- "Can I briefly drop life support to power the engines?"

**What makes it satisfying:**
- The puzzle of making it all fit
- Tension of critical systems at minimum
- Clever solutions (briefly sacrifice X to accomplish Y)

**Note:** This evolved into our simpler POWER program with on/off toggles and power tiers.

---

### 7. Navigation Maneuver

**The fun:** Timing and precision under pressure

**Core Loop:**
- See the threat coming (debris field, radiation wave, collision course)
- Plan your burns (direction and timing)
- Execute in real-time
- Watch the ship respond (sluggish, momentum-based)
- Did you avoid the threat? Barely scraped by? Hit something?

**Implementation Ideas:**
- Radar/scanner view showing ship and threats
- Burn controls: direction + thrust power
- Ship has inertia - doesn't stop or turn instantly
- Multiple threats require multiple maneuvers
- Fuel/delta-V budget limits total burns

**Threat types:**
- Debris field (many small objects to weave through)
- Large object collision course (one big dodge)
- Radiation wave (need to get behind something)
- Unstable orbit (need correction burns)

**What makes it satisfying:**
- The tension of incoming threat
- Threading through a debris field
- Last-second saves
- Mastering the momentum-based controls

---

## How Mechanics Should Connect

Mechanics shouldn't be isolated minigames - they should feed into each other.

**Hacking + Power: The Reboot Trick**

This is how hacking actually takes effect:
1. Use HEXEDIT to redirect a value (e.g., door timeout → ROCKS score address)
2. Nothing happens yet - the system is already running with old value
3. Set up your source (play ROCKS, get the exact score you need)
4. Use POWER to turn off that system/section
5. Turn it back on - it re-initializes and reads from the new address
6. Now it runs with your hacked value

This connects hacking and power naturally:
- Hacking alone doesn't magically change running systems
- Power-cycling becomes a meaningful action (reboot to apply changes)
- Feels like how real systems work (config loads at boot)
- No special "apply hack" button - just turn it off and on again

**Power creates constraints:**
- Can't run everything at once
- Forces choices about what to enable
- Makes other mechanics feel consequential

**Exact connections TBD during implementation** - don't want to over-design before building.

---

## New Programs Needed

| Program | Mechanic | Description |
|---------|----------|-------------|
| HEXEDIT | Memory Hacking | Memory scanner, value hunter, pointer redirector |
| PROBE | Orbital Mechanics | Launch interface, trajectory planner |
| DRONE | Remote EVA | External camera, wireframe view, battery management |
| NAV | Navigation | Threat display, burn controls, maneuvering |
| SIGNAL | Communication | Alien pattern vocabulary, response construction |

---

## Existing Programs - Repurposed

| Program | Original Purpose | New Purpose via Hacking |
|---------|------------------|-------------------------|
| ROCKS | Arcade game - shoot asteroids | Generate large numerical values via score |
| MOONTAXI | Arcade game - ferry passengers | Generate text sequences via delivery order |
| CHESS | Strategy game vs AI | Generate small integers (1-4) via difficulty; Knight underpromotion exploit unlocks HEXEDIT |
| ELIZA | Chat with stasis bay AI | Story driver, hints, emotional anchor |
| STATUS | Life support display | Shows power state, hull breach, system health |
| ANALYZER | FFT spectrum analyzer | Decode alien signals, find frequencies |

---

## Program Unlock Flow

| When | Program | Purpose |
|------|---------|---------|
| Start | STATUS, ELIZA | Basic awareness, story |
| Phase 1 | SOLAR | Fix power |
| Phase 2 | POWER | System management (persistent) |
| Phase 2 | DEFENSE | Point defense - clear debris, threats |
| Phase 3 | ANALYZER | Decode signals |
| Phase 5 | DRONE | External inspection |
| Phase 5 | HEXEDIT | Access restricted data (unlocked via CHESS exploit) |
| Phase 6 | SIGNAL, PROBE | Communicate, navigate |

**Reused programs:**
- POWER: Phase 2 (learn), Phase 4 (pressure), Phase 5 (enable drone), Phase 7 (crisis)
- DEFENSE: Phase 2 (learn, 3 debris), Phase 4 (pressure, more debris), Phase 7 (crisis)

**Arcade Games (ROCKS, MOONTAXI, CHESS):**
- Unlock gradually as "entertainment" / stress relief
- CHESS exploit (knight underpromotion) unlocks HEXEDIT itself
- Become puzzle *tools* when HEXEDIT introduces memory hacking
- Satisfying "aha" when player realizes games generate values for hacking

---

## Ideas to Explore

Half-baked concepts that might become puzzles:

### Cipher Decoding (Transposition/Rotation)

Receive encoded messages that need manual decryption. Classic cipher techniques:
- **Rotation (Caesar cipher):** Shift letters by N positions (ROT13, etc.)
- **Transposition:** Letters are scrambled by position (rail fence, columnar)
- **Combined:** Rotate first, then transpose (or vice versa)

Could be used for:
- Decoding intercepted transmissions
- Reading corrupted ship logs
- Alien messages that use human ciphers (why would they know these? mystery hook?)
- Emergency codes from other survivors

Interface ideas:
- Show ciphertext on oscilloscope as scrolling characters
- Knobs to adjust rotation amount, see text shift in real-time
- Grid view for transposition puzzles
- Frequency analysis display (letter distribution histogram)

**Needs more thought:** What makes this fun vs. tedious? How does it fit the oscilloscope aesthetic?

---

## Open Design Questions

These need to be figured out during implementation:

1. **DEFENSE controls:** Keyboard aiming? Mouse? How "3D" does it feel?
2. **How urgent is Phase 4?** Real-time pressure? Or just narrative urgency?
3. **What's on the hull?** Alien device? Sabotage evidence? The mystery hook.
4. **Alien motivation:** Why are they helping? Revealed at end or earlier?
5. **Final resolution:** Rescue arrives? You reach safety? The answer to the mystery?
6. **Cipher puzzles:** Where do they fit narratively? Who's sending encoded messages and why?

---

## What's NOT in the Design

- No branching story paths (exponential design complexity)
- No "choice" prompts that could soft-lock
- No mission dumps from Eliza (one small ask at a time)
- No arcade games as stand-ins for real tasks (DEFENSE is a real ship system)
- No one-and-done mechanics (POWER and DEFENSE return under pressure)
- No task that doesn't directly enable something
