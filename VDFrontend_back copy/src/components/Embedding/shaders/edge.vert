  precision highp float;
  attribute vec2 position;
  attribute vec2 textureCoord;
  uniform float lineWidth;
  uniform mat3 dataScaleMatrix;
  uniform mat3 zoomMatrix;
  uniform mat3 normalizeMatrix;
  uniform float alpha;
  uniform float userAlpha;
  varying vec2 fragTextureCoord;
  varying float fragAlpha;

  void main() {

  // Init variables in main
  // https://stackoverflow.com/questions/61765147/initializing-global-variables-in-glsl
  mat3 transformMatrix = dataScaleMatrix * zoomMatrix * normalizeMatrix;

  // Scale the point based on the zoom level
  // https://observablehq.com/@bmschmidt/zoom-strategies-for-huge-scatterplots-with-three-js
  float dynamicWidth = lineWidth * (exp(log(zoomMatrix[0][0]) * 0.55));
  float dynamicAlpha = min(0.4, max(0.1, alpha * log(zoomMatrix[0][0]) / 2.0));
  dynamicAlpha = max(userAlpha, dynamicAlpha);

  fragTextureCoord = textureCoord;
  fragAlpha = dynamicAlpha;
//   gl_LineWidth = dynamicWidth;

  // Normalize the vertex position
  vec3 normalizedPosition = vec3(position, 1.0) * transformMatrix;
  gl_Position = vec4(normalizedPosition.x, normalizedPosition.y, 0.0, 1.0);
}