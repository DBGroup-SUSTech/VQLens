  precision highp float;
  uniform sampler2D texture;
  varying float fragAlpha;
  varying vec2 fragTextureCoord;
  void main() {
    vec4 color = texture2D(texture, fragTextureCoord);
    vec4 colorOpacity = color * fragAlpha * color[3];
    gl_FragColor = colorOpacity;
  }