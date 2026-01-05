// === RESONANT VASCULARITY: FINAL FIXED VERSION ===

let rdShader;
let pg, nextPg;
let soilImage;
let nodes = []; // <--- FIXED: Added the brackets here
let phase = 0; // 0=Soil, 1=Read, 2=Grow
let maxNodes = 3000;

// --- SHADER CODE ---
const vertShader = `
  attribute vec3 aPosition;
  attribute vec2 aTexCoord;
  varying vec2 vTexCoord;
  void main() {
    vTexCoord = aTexCoord;
    vec4 positionVec4 = vec4(aPosition, 1.0);
    positionVec4.xy = positionVec4.xy * 2.0 - 1.0;
    gl_Position = positionVec4;
  }
`;

const fragShader = `
  precision mediump float;
  varying vec2 vTexCoord;
  uniform sampler2D uTexture;
  uniform vec2 uResolution;

  void main() {
    vec2 pixel = 1.0 / uResolution;
    vec2 uv = vTexCoord;
    vec4 color = texture2D(uTexture, uv);
    float a = color.r;
    float b = color.g;

    // Laplacian
    float sumA = 0.0;
    float sumB = 0.0;
    for(int x=-1; x<=1; x++){
      for(int y=-1; y<=1; y++){
        vec2 offset = vec2(float(x), float(y)) * pixel;
        vec4 neighbor = texture2D(uTexture, uv + offset);
        float weight = (x==0 && y==0)? -1.0 : (abs(x)+abs(y)==1? 0.2 : 0.05);
        sumA += neighbor.r * weight;
        sumB += neighbor.g * weight;
      }
    }

    // Gray-Scott Reaction Parameters
    float feed = 0.055 - (uv.y * 0.01);
    float kill = 0.062 + (uv.x * 0.01);

    float reaction = a * b * b;
    float nextA = a + (1.0 * sumA - reaction + feed * (1.0 - a));
    float nextB = b + (0.5 * sumB + reaction - (feed + kill) * b);

    gl_FragColor = vec4(clamp(nextA, 0.0, 1.0), clamp(nextB, 0.0, 1.0), 0.0, 1.0);
  }
`;

function setup() {
  createCanvas(600, 600, WEBGL);
  pixelDensity(1);
  noSmooth();

  // Create shader
  rdShader = createShader(vertShader, fragShader);

  // Setup Buffers
  pg = createFramebuffer(width, height);
  nextPg = createFramebuffer(width, height);

  // Seed the simulation
  pg.begin();
  background(255, 0, 0); // Fill A
  fill(0, 255, 0);       // Seed B
  noStroke();
  rectMode(CENTER);
  rect(0, 0, 20, 20);
  pg.end();

  rectMode(CENTER);
}

function draw() {

  if (phase === 0) {
    // === PHASE 1: GROWING THE SOIL ===
    for (let i = 0; i < 10; i++) {
      nextPg.begin();
      shader(rdShader);
      rdShader.setUniform('uTexture', pg);
      rdShader.setUniform('uResolution', [width, height]);
      rect(0, 0, width, height);
      nextPg.end();

      let temp = pg;
      pg = nextPg;
      nextPg = temp;
    }

    image(pg, -width/2, -height/2);

    if (frameCount > 100) {
      phase = 1;
    }

  } else if (phase === 1) {
    // === PHASE 2: SAMPLING ===
    soilImage = pg.get();
    soilImage.loadPixels();

    background(245, 240, 235); // Paper color
    initVines();
    phase = 2;

  } else if (phase === 2) {
    // === PHASE 3: GROWING ===
    translate(-width/2, -height/2);
    updateVines();
    drawVines();

    if (nodes.length > maxNodes) {
      noLoop();
      console.log("Finished.");
    }
  }
}

function initVines() {
  for (let i = 0; i < 20; i++) {
    let angle = map(i, 0, 20, 0, TWO_PI);
    let r = 100;
    let x = width/2 + cos(angle) * r;
    let y = height/2 + sin(angle) * r;
    nodes.push(createVector(x, y));
  }
}

function updateVines() {
  let separationDist = 8;

  for (let i = 0; i < nodes.length; i++) {
    let n = nodes[i];
    let force = createVector(0, 0);

    // Separation
    let count = 0;
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      let other = nodes[j];
      let d = p5.Vector.dist(n, other);
      if (d < separationDist && d > 0) {
        let push = p5.Vector.sub(n, other);
        push.normalize();
        push.div(d);
        force.add(push);
        count++;
      }
    }

    // Attraction (Wind)
    let scale = 0.005;
    let angle = noise(n.x * scale, n.y * scale) * TWO_PI * 4;
    let wind = p5.Vector.fromAngle(angle);
    wind.mult(0.5);
    force.add(wind);

    // Constraint (Soil)
    let px = Math.floor(n.x);
    let py = Math.floor(height - n.y);
    if (px > 0 && px < width && py > 0 && py < height) {
      let index = (px + py * width) * 4;
      let fertility = soilImage.pixels[index + 1];

      if (fertility < 50) {
        let center = createVector(width/2, height/2);
        let pushIn = p5.Vector.sub(center, n);
        pushIn.normalize();
        pushIn.mult(2.0);
        force.add(pushIn);
      }
    }

    if (count > 0) force.div(count);
    force.limit(2);
    n.add(force);

    n.x = constrain(n.x, 10, width - 10);
    n.y = constrain(n.y, 10, height - 10);
  }

  // Growth
  for (let i = 0; i < nodes.length - 1; i++) {
    let n1 = nodes[i];
    let n2 = nodes[i+1];
    let d = p5.Vector.dist(n1, n2);

    if (d > separationDist) {
       let midX = (n1.x + n2.x)/2;
       let midY = (height - (n1.y + n2.y)/2);
       let idx = (Math.floor(midX) + Math.floor(midY) * width) * 4;

       // Only grow if pixel is fertile (Green channel > 100)
       if (soilImage.pixels[idx+1] > 100) {
         let mid = p5.Vector.add(n1, n2).div(2);
         nodes.splice(i + 1, 0, mid);
         i++;
       }
    }
  }
}

function drawVines() {
  stroke(20, 25, 30, 40);
  strokeWeight(1);
  noFill();

  beginShape();
  for (let n of nodes) {
    let jx = random(-0.5, 0.5);
    let jy = random(-0.5, 0.5);
    curveVertex(n.x + jx, n.y + jy);
  }
  endShape();
}
