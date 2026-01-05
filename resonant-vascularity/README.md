# Resonant Vascularity

A generative art piece exploring organic growth through reaction-diffusion systems and emergent behavior.

## What Is This?

**Resonant Vascularity** is an interactive generative art simulation that mimics how plants and organic structures grow in nature. It combines two fascinating computational concepts:

1. **Reaction-Diffusion (Gray-Scott Model)** - A chemical simulation that creates natural-looking patterns
2. **Emergent Vine Growth** - Autonomous agents that grow following the fertile patterns

## How It Works

### Phase 1: Growing the Soil (Frames 0-100)
The simulation starts by creating a "soil" pattern using the **Gray-Scott reaction-diffusion model**. This is the same mathematical system that explains how leopards get their spots and zebras get their stripes!

- **Red areas** represent chemical A (barren soil)
- **Green areas** represent chemical B (fertile soil)
- The chemicals react and diffuse, creating organic patterns

### Phase 2: Sampling
The system captures the soil pattern and analyzes where growth can occur. Green areas with high fertility values become the guidance system for the vines.

### Phase 3: Growing the Vines
Vine structures emerge and grow based on:

- **Separation**: Nodes push away from each other to avoid overcrowding
- **Wind/Noise**: Perlin noise creates natural, wavy movement
- **Soil Constraint**: Vines are attracted to fertile (green) areas and pushed away from barren (non-green) areas
- **Growth**: New nodes are added between existing ones, but only in fertile soil

The result is an organic, tree-like or coral-like structure that respects the underlying pattern.

## Technical Details

### Technologies Used
- **p5.js** - Creative coding framework
- **WebGL** - For shader-based reaction-diffusion
- **GLSL Shaders** - Custom vertex and fragment shaders for the simulation

### Key Parameters You Can Modify

In `sketch.js`:

```javascript
let maxNodes = 3000;              // Maximum number of vine nodes
let separationDist = 8;           // How close nodes can be
let fertility = soilImage.pixels[index + 1];  // Green channel threshold
```

**Reaction-Diffusion Parameters** (in the shader):
```glsl
float feed = 0.055 - (uv.y * 0.01);  // Feed rate (varies by Y position)
float kill = 0.062 + (uv.x * 0.01);  // Kill rate (varies by X position)
```

## Running the Project

### Option 1: Open Locally
Simply open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari).

### Option 2: Local Server
For the best experience, run a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js
npx http-server
```

Then navigate to `http://localhost:8000`

## Customization Ideas

Want to experiment? Try these modifications:

1. **Change Canvas Size** (sketch.js:60)
   ```javascript
   createCanvas(800, 800, WEBGL);  // Bigger canvas
   ```

2. **Adjust Growth Speed** (sketch.js:92)
   ```javascript
   for (let i = 0; i < 20; i++) {  // Faster soil growth
   ```

3. **More Starting Vines** (sketch.js:144)
   ```javascript
   for (let i = 0; i < 50; i++) {  // More initial nodes
   ```

4. **Different Colors** (sketch.js:221)
   ```javascript
   stroke(100, 50, 150, 60);  // Purple vines
   ```

## The Science Behind It

### Gray-Scott Reaction-Diffusion
This mathematical model simulates two chemicals (A and B) that:
- **React**: A + 2B → 3B (B converts A into more B)
- **Diffuse**: Both chemicals spread out over time
- **Feed/Kill**: A is continuously added, B is continuously removed

By varying the feed and kill rates across the canvas, we get different pattern formations.

### Emergent Behavior
The vine growth demonstrates **emergence** - complex patterns arising from simple rules:
- Each node only knows about nearby nodes
- No central "brain" directs the growth
- Beautiful patterns emerge from local interactions

## Credits & Inspiration

This project draws inspiration from:
- Alan Turing's work on morphogenesis
- Karl Sims' work on artificial evolution
- Nature's endless patterns: coral reefs, tree branches, river deltas

## License

This project is open source and available for educational and creative purposes.

## Questions?

This is a learning project! Feel free to experiment, break things, and discover how the code works. The best way to learn is to change parameters and see what happens.

Happy coding! 🌿
