import { Filter, GlProgram } from 'pixi.js';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;
vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}
vec2 filterTextureCoord(void) { return aPosition * (uOutputFrame.zw * uInputSize.zw); }
void main(void) { gl_Position = filterVertexPosition(); vTextureCoord = filterTextureCoord(); }
`;
const fragment = `
precision mediump float;
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform float uTime;
uniform float uStrength;
uniform vec2 uScale;
// Cheap caustics: two layers of interfering sine waves, sharpened.
float caustic(vec2 p, float t) {
  float a = sin(p.x * 3.1 + t * 0.7) + sin(p.y * 2.7 - t * 0.5) + sin((p.x + p.y) * 2.2 + t * 0.9);
  float b = sin(p.x * 5.3 - t * 0.6 + 1.7) + sin(p.y * 4.1 + t * 0.8) + sin((p.x - p.y) * 3.7 - t * 0.4);
  float v = (a + b) / 6.0;
  return pow(max(0.0, v), 3.0);
}
void main(void) {
  vec4 color = texture(uTexture, vTextureCoord);
  vec2 p = vTextureCoord * uScale;
  float c = caustic(p, uTime) * 0.7 + caustic(p * 1.9 + 3.0, uTime * 1.3) * 0.3;
  // Fade with depth: stronger near the top of the screen.
  float depth = 1.0 - vTextureCoord.y * 0.8;
  finalColor = color + vec4(0.55, 0.85, 1.0, 0.0) * c * uStrength * depth * color.a;
}
`;

/** Animated underwater light pattern applied to the background layer (WebGL only). */
export class CausticsFilter extends Filter {
  constructor(strength = 0.12) {
    super({
      glProgram: GlProgram.from({ vertex, fragment, name: 'caustics' }),
      resources: {
        causticsUniforms: {
          uTime: { value: 0, type: 'f32' },
          uStrength: { value: strength, type: 'f32' },
          uScale: { value: [6, 3], type: 'vec2<f32>' },
        },
      },
    });
  }
  set time(t: number) {
    (
      this.resources as { causticsUniforms: { uniforms: { uTime: number } } }
    ).causticsUniforms.uniforms.uTime = t;
  }
}
