# Oscilloscope - Story Arc Design Document

## Design Philosophy

**Mechanics first, story second.**

Define what's FUN to do, then wrap narrative around it. The player experiences everything through the oscilloscope terminal in their stasis pod. Every interaction is mediated through this green phosphor display.

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

### 6. Power Routing

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

## Existing Programs - Repurposed

| Program | Original Purpose | New Purpose via Hacking |
|---------|------------------|-------------------------|
| ROCKS | Arcade game - shoot asteroids | Generate large numerical values via score |
| MOONTAXI | Arcade game - ferry passengers | Generate text sequences via delivery order |
| CHESS | Strategy game vs AI | Generate small integers (1-4) via difficulty |
| ELIZA | Chat with stasis bay AI | Story driver, hints, emotional anchor |
| STATUS | Life support display | Shows power state, hull breach, system health |
| ANALYZER | FFT spectrum analyzer | Decode alien signals, find frequencies |

---

## New Programs Needed

| Program | Mechanic | Description |
|---------|----------|-------------|
| HEXEDIT | Memory Hacking | Memory scanner, value hunter, pointer redirector |
| PROBE | Orbital Mechanics | Launch interface, trajectory planner |
| DRONE | Remote EVA | External camera, wireframe view, battery management |
| POWER | Power Routing | System allocation interface |
| NAV | Navigation | Threat display, burn controls, maneuvering |
| SIGNAL | Communication | Alien pattern vocabulary, response construction |

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

---

## Opening Sequence (First Test)

Not set in stone - this is the first sequence to prototype and test.

1. Player awakens, seeing their status (STATUS program)
2. Weird noise plays (sound effect needed), screen jitter/distortion spikes, player heartrate spikes
   - Player vitals move to a global system for this
3. Player can Ctrl-C out of STATUS back to base OS
4. Only two commands unlocked: STATUS and ELIZA
5. Player talks to Eliza
   - Through conversation, player learns they're highest ranking crew member awake
   - After short psych assessment, Eliza marks player as acting commander
   - Eliza reveals: Player is the ranking Systems Engineer
   - Eliza reports: Power is critical - solar panel array misaligned
   - Eliza directs: Player must run 'Solar' program to check alignment and fix power supply

---

## Open Design Questions

These need to be figured out during implementation, not speculated on now:

- How do mechanics gate each other? (Design when building)
- What game state flags are needed? (Emerge from implementation)
- What's the exact progression order? (Playtest to find out)
- Story details? (Fit around mechanics as they're built)

