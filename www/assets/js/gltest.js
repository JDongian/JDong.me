var canvas;
var gl;

var squareVerticesBuffer;
var squareVerticesColorBuffer;
var squareRotation = 0.0;
var squareXOffset = 0.0;
var squareYOffset = 0.0;
var squareZOffset = 0.0;
var lastSquareUpdateTime = 0;
var xIncValue = 0.2;
var yIncValue = -0.4;
var zIncValue = 0.3;

var mvMatrix;
var shaderProgram;
var vertexPositionAttribute;
var vertexColorAttribute;
var perspectiveMatrix;

var horizAspect;

var drawSceneCode;

function start(w, h) {
    initCanvas(w, h);
    canvas = document.getElementById("glcanvas");
    initWebGL(canvas);
    if (gl) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);  // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things
        initShaders();
        initBuffers();
        // Set up to draw the scene periodically.
        drawSceneCode = setInterval(drawScene, 16);
    }
}
function initCanvas(w, h) {
    horizAspect = (1.*w)/h;
    $("#testcanvas").html(
            '<canvas id="glcanvas" width="'+w+'" height="'+h+'" style="border:1px solid rgb(100,100,100);">'+
            'Your browser doesn\'t appear to support the <canvas> element.'+
            '</canvas>');
}
function initWebGL() {
    gl = null;
    try {
        gl = canvas.getContext("webgl") ||
             canvas.getContext("experimental-webgl");
    } catch(e) {}
    if (!gl) {
        $("#error").html("Unable to initialize WebGL.");
    }
}
function initBuffers() {
    squareVerticesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
    var vertices = [
        1.0,  1.0,  0.0,
        -1.0, 1.0,  0.0,
        1.0,  -1.0, 0.0,
        -1.0, -1.0, 0.0
            ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    var colors = [
        1.0,  1.0,  1.0,  1.0,    // white
        1.0,  0.0,  0.0,  1.0,    // red
        0.0,  1.0,  0.0,  1.0,    // green
        0.0,  0.0,  1.0,  1.0     // blue
            ];

    squareVerticesColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
}
function drawScene() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // Establish the perspective with which we want to view the
    // scene. Our field of view is 45 degrees, with a width/height
    // ratio of 640:480, and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
    perspectiveMatrix = makePerspective(45, horizAspect, 0.1, 100.0);
    loadIdentity();
    mvTranslate([-0.0, 0.0, -6.0]);
    mvPushMatrix();
    mvRotate(squareRotation, [1, 0, 1]);
    mvTranslate([squareXOffset, squareYOffset, squareZOffset]);
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesBuffer);
    gl.vertexAttribPointer(vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, squareVerticesColorBuffer);
    gl.vertexAttribPointer(vertexColorAttribute, 4, gl.FLOAT, false, 0, 0);
    setMatrixUniforms();
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    mvPopMatrix();
    // Update the rotation for the next draw, if it's time to do so.
    var currentTime = (new Date).getTime();
    if (lastSquareUpdateTime) {
        var delta = currentTime - lastSquareUpdateTime;
        squareRotation += (10 * delta) / 1000.0;
        //squareXOffset += xIncValue * ((30 * delta) / 1000.0);
        //squareYOffset += yIncValue * ((30 * delta) / 1000.0);
        //squareZOffset += zIncValue * ((30 * delta) / 1000.0);
        //if (Math.abs(squareYOffset) > 2.5) {
        //    xIncValue = -xIncValue;
        //    yIncValue = -yIncValue;
        //    zIncValue = -zIncValue;
        //}
    }
    lastSquareUpdateTime = currentTime;
}
function initShaders() {
    var fragmentShader = getShader(gl, "shader-fs");
    var vertexShader = getShader(gl, "shader-vs");
    shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        $("#error").html("Unable to initialize the shader program.");
    }
    gl.useProgram(shaderProgram);
    vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
    gl.enableVertexAttribArray(vertexPositionAttribute);
    vertexColorAttribute = gl.getAttribLocation(shaderProgram, "aVertexColor");
    gl.enableVertexAttribArray(vertexColorAttribute);
}
function getShader(gl, id) {
    var shaderScript = $("#"+id);
    if (!shaderScript) return null;
    src = shaderScript.html();
    var shader;
    switch (shaderScript.attr("type")) {
        case "x-shader/x-fragment":
            shader = gl.createShader(gl.FRAGMENT_SHADER);
            break;
        case "x-shader/x-vertex":
            shader = gl.createShader(gl.VERTEX_SHADER);
            break;
        default:
            $("#error").html("Unexpected shader type.");
            return null;
    }
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        $("#error").html("An error occurred compiling the shaders: " + gl.getShaderInfoLog(shader));
        return null;
    }
    return shader;
}
function loadIdentity() {
    mvMatrix = Matrix.I(4);
}
function multMatrix(m) {
    mvMatrix = mvMatrix.x(m);
}
function mvTranslate(v) {
    multMatrix(Matrix.Translation($V([v[0], v[1], v[2]])).ensure4x4());
}
function setMatrixUniforms() {
    var pUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
    gl.uniformMatrix4fv(pUniform, false, new Float32Array(perspectiveMatrix.flatten()));

    var mvUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
    gl.uniformMatrix4fv(mvUniform, false, new Float32Array(mvMatrix.flatten()));
}
var mvMatrixStack = [];
function mvPushMatrix(m) {
    if (m) {
        mvMatrixStack.push(m.dup());
        mvMatrix = m.dup();
    } else {
        mvMatrixStack.push(mvMatrix.dup());
    }
}
function mvPopMatrix() {
    if (!mvMatrixStack.length) {
        throw("Can't pop from an empty matrix stack.");
    }

    mvMatrix = mvMatrixStack.pop();
    return mvMatrix;
}
function mvRotate(angle, v) {
    var inRadians = angle * Math.PI / 180.0;

    var m = Matrix.Rotation(inRadians, $V([v[0], v[1], v[2]])).ensure4x4();
    multMatrix(m);
}
