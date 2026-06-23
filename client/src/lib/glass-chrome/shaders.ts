export const vertexSource = `
attribute vec2 a_position;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const fragmentSource = `
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
uniform vec2 u_lightPos;
uniform float u_focusX;
uniform float u_focusY;
uniform float u_focusWidth;
uniform float u_focusHeight;
uniform float u_surfaceRadius;
uniform float u_focusRadius;
uniform float u_transitionVel;
uniform float u_pressAmt;
uniform float u_focusStrength;
uniform vec3 u_tintColor;

float sdRoundedBox(vec2 p, vec2 halfSize, float radius) {
  vec2 q = abs(p) - halfSize + radius;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - radius;
}

void main() {
  vec2 p = gl_FragCoord.xy - u_resolution * 0.5;

  vec2 surfaceHalf = u_resolution * 0.5 - 1.0;
  float surfaceDist = sdRoundedBox(p, surfaceHalf, u_surfaceRadius);
  float surfaceMask = 1.0 - smoothstep(-1.0, 0.5, surfaceDist);
  float surfaceEdge = smoothstep(2.5, 0.0, abs(surfaceDist)) * surfaceMask;

  vec2 focusCenter = vec2(
    u_focusX - u_resolution.x * 0.5,
    u_resolution.y * 0.5 - u_focusY
  );
  vec2 focusHalf = vec2(u_focusWidth * 0.5, u_focusHeight * 0.5);
  float focusR = min(u_focusRadius, min(focusHalf.x, focusHalf.y));
  float focusDist = sdRoundedBox(p - focusCenter, focusHalf, focusR);
  float focusMask = (1.0 - smoothstep(-1.0, 0.5, focusDist)) * u_focusStrength;
  float focusEdge = smoothstep(2.0, 0.0, abs(focusDist)) * focusMask;

  float surfaceYNorm = p.y / (u_resolution.y * 0.5);
  float focusYNorm = (p.y - focusCenter.y) / max(focusHalf.y, 1.0);

  float lightBias = u_lightPos.y * 0.25 + 0.15;
  float surfaceTopWeight = clamp(surfaceYNorm * 0.25 + 0.5 + lightBias, 0.15, 1.0);
  float focusTopWeight = clamp(focusYNorm * 0.3 + 0.5 + lightBias, 0.15, 1.0);

  vec2 lightDir2D = u_lightPos * 0.5 + vec2(0.0, 0.3);
  float lLen = length(lightDir2D);
  if (lLen > 0.001) lightDir2D /= lLen;

  float surfaceAngle = dot(normalize(p + vec2(0.001)), lightDir2D) * 0.5 + 0.5;
  float surfaceSpec = pow(surfaceAngle, 5.0) * 0.04;

  vec2 pRel = (p - focusCenter) / max(focusHalf, vec2(1.0));
  float focusAngle = dot(normalize(pRel + vec2(0.001)), lightDir2D) * 0.5 + 0.5;
  float focusSpec = pow(focusAngle, 4.0) * 0.07;

  float pDist01 = length(pRel);
  float chromStrength = smoothstep(0.35, 1.0, pDist01) * focusMask;

  vec3 color = vec3(1.0);
  vec3 edgeTint = mix(vec3(1.0), u_tintColor, chromStrength * 0.6);
  color = mix(color, edgeTint, focusMask);

  color.r += chromStrength * pRel.x * 0.18;
  color.b -= chromStrength * pRel.x * 0.18;
  color.g += chromStrength * abs(pRel.y) * 0.06;

  float edgeGlow = smoothstep(0.6, 1.0, pDist01) * focusMask;
  color += u_tintColor * edgeGlow * 0.2;

  vec2 surfaceNorm = p / (u_resolution * 0.5);
  float surfaceChrom = smoothstep(0.6, 1.0, length(surfaceNorm)) * surfaceMask;
  color.r += surfaceChrom * surfaceNorm.x * 0.07;
  color.b -= surfaceChrom * surfaceNorm.x * 0.07;

  float lensCenter = (1.0 - pDist01 * pDist01) * 0.04 * focusMask;
  float pressGlow = u_pressAmt * 0.06 * surfaceMask;
  float pressEdge = u_pressAmt * focusEdge * 0.2;

  float absVel = abs(u_transitionVel);
  float motionSpeed = smoothstep(80.0, 400.0, absVel);
  float velDir = clamp(u_transitionVel * 0.003, -1.0, 1.0);
  vec2 motionLight = normalize(vec2(-velDir * 0.8, 0.4));
  float motionDot = dot(normalize(pRel + vec2(0.001)), motionLight) * 0.5 + 0.5;
  float motionHighlight = pow(motionDot, 3.0) * motionSpeed * 0.15 * focusMask;
  float motionStreak = pow(motionDot, 12.0) * motionSpeed * 0.2 * focusMask;

  float motionChrom = motionSpeed * chromStrength * 0.7;
  color.r += motionChrom * pRel.x * 0.12;
  color.b -= motionChrom * pRel.x * 0.12;

  float alpha = 0.0;
  alpha += surfaceEdge * surfaceTopWeight * 0.22;
  alpha += surfaceSpec * surfaceMask;
  alpha += focusMask * 0.025;
  alpha += focusEdge * focusTopWeight * 0.35;
  alpha += focusSpec * focusMask;
  alpha += lensCenter;
  alpha += pressGlow;
  alpha += pressEdge;
  alpha += motionHighlight;
  alpha += motionStreak;

  alpha *= surfaceMask;
  alpha = clamp(alpha, 0.0, 0.6);

  gl_FragColor = vec4(color * alpha, alpha);
}
`;