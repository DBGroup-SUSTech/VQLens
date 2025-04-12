import d3 from '../../utils/d3-import';
import { config } from '../../config/config';
import { updatePopperTooltip } from './EmbeddingLabel';
import fragmentShader from './shaders/point.frag?raw';
import vertexShader from './shaders/point.vert?raw';
import * as Labeler from './EmbeddingLabel';

import edgeFragmentShader from './shaders/edge.frag?raw';
import edgeVertexShader from './shaders/edge.vert?raw';

let pointMouseenterTimer = null;
let pointMouseleaveTimer = null;

export function initWebGLMatrices(that) {
    // Convert the x and y scales to a matrix (applying scale is cheaper in GPU)

    const xDomainMid = (that.xScale.domain()[0] + that.xScale.domain()[1]) / 2;
    const yDomainMid = (that.yScale.domain()[0] + that.yScale.domain()[1]) / 2;

    const xRangeMid = (that.xScale.range()[0] + that.xScale.range()[1]) / 2;
    const yRangeMid = (that.yScale.range()[0] + that.yScale.range()[1]) / 2;

    const xMultiplier =
        (that.xScale.range()[1] - that.xScale.range()[0]) /
        (that.xScale.domain()[1] - that.xScale.domain()[0]);

    const yMultiplier =
        (that.yScale.range()[1] - that.yScale.range()[0]) /
        (that.yScale.domain()[1] - that.yScale.domain()[0]);

    // WebGL is column-major!
    // Transform from data space to stage space (same as applying that.xScale(),
    // and that.yScale())

    const dataScaleMatrix = [
        [xMultiplier, 0, -xMultiplier * xDomainMid + xRangeMid],
        [0, yMultiplier, -yMultiplier * yDomainMid + yRangeMid],
        [0, 0, 1]
    ];

    // 适当调整平移量，使得绘图区域的中心与视图的中心对齐
    // dataScaleMatrix[0][2] += (that.svgFullSize.width / 2 - xRangeMid);
    // dataScaleMatrix[1][2] += (that.svgFullSize.height / 2 - yRangeMid);
    const dataScaleMatrix1D = dataScaleMatrix.flat();

    // Transforming the stage space to the normalized coordinate
    // Note we need to flip the y coordinate
    const normalizeMatrix = [
        [2 / that.svgFullSize.width, 0, -1],
        [0, -2 / that.svgFullSize.height, 1],
        [0, 0, 1]
    ];

    const normalizeMatrix1D = normalizeMatrix.flat();


    // 将所有矩阵存储在 webGLMatrices 对象中
    that.webGLMatrices = {
        dataScaleMatrix: dataScaleMatrix1D,
        normalizeMatrix: normalizeMatrix1D,
    };

}

export function initWebGLBuffers(that) {
    if (that.gridData === null) {
        throw new Error('GridData is null.');
    }

    // 获取每个点的位置和颜色
    const positions = [];
    const textureCoords = [];

    for (const point of that.promptPoints) {
        positions.push([point.x, point.y]);
        textureCoords.push([0, 0]);
    }

    let totalPointSize = that.gridData.totalPointSize;

    that.frontPositionBuffer = that.pointRegl.buffer({
        length: totalPointSize * 4 * 2,
        type: 'float',
        usage: 'dynamic'
    });
    that.frontPositionBuffer.subdata(positions, 0);

    that.frontTextureCoordinateBuffer = that.pointRegl.buffer({
        length: totalPointSize * 4 * 2,
        type: 'float',
        usage: 'dynamic'
    });
    that.frontTextureCoordinateBuffer.subdata(textureCoords, 0);
    that.frontBufferPointSize = that.promptPoints.length;
}

/**
 * Draw a scatter plot for the UMAP.
 */
export function drawScatterPlot(that) {
    if (!that.webGLMatrices) {
        throw Error('webGLMatrices not initialized');
    }

    that.pointRegl.clear({
        color: [0, 0, 0, 0],
        depth: 1
    });

    // Adjust point width based on the number of points to draw
    let pointCount = that.loadedPointCount;


    // Logarithmic regression by fitting the following three points
    // https://keisan.casio.com/exec/system/14059930226691
    // [(6e4, 2), (3e5, 1), [1.8e6, 0.5]]
    const a = 6.71682071;
    const b = -0.437974871;
    that.curPointWidth =
        a +
        b *
        Math.log(
            config.layout.scatterDotRadius *
            (that.svgFullSize.height / 10000000) *
            pointCount
        );
    that.curPointWidth = Math.min(5, that.curPointWidth);
    that.curPointWidth = Math.max(0.4, that.curPointWidth);
    const alpha = 1 / (Math.log(pointCount) / Math.log(500));

    // Get the current zoom
    const zoomMatrix = getZoomMatrix(that.curZoomTransform);

    // Create a texture array (default 3x1)
    let textureArray = [
        config.layout.defaultPointColorInt[0],
        config.layout.defaultPointColorInt[1],
        config.layout.defaultPointColorInt[2],
        255,
        config.layout.secondPointColorInt[0],
        config.layout.secondPointColorInt[1],
        config.layout.secondPointColorInt[2],
        255,
        255,
        255,
        255,
        0
    ];
    // [default color, second color, transparent, empty]
    const texture = that.pointRegl.texture({
        width: 3,
        height: 1,
        data: textureArray,
        format: 'rgba'
    });

    // If user specifies an alpha level, we use it to override auto-alpha
    let userAlpha = -1.0;
    if (that.gridData && that.gridData.opacity !== undefined) {
        userAlpha = Math.max(0, Math.min(that.gridData.opacity, 1));
    }

    const drawPoints = that.pointRegl({
        depth: { enable: false },
        stencil: { enable: false },
        frag: fragmentShader,
        vert: vertexShader,

        attributes: {
            position: {
                buffer: that.frontPositionBuffer,
                stride: 2 * 4,
                offset: 0
            },
            textureCoord: {
                buffer: that.frontTextureCoordinateBuffer,
                stride: 2 * 4,
                offset: 0
            }
        },
        uniforms: {
            // Placeholder for function parameters
            pointWidth: 1.2,
            dataScaleMatrix: that.webGLMatrices.dataScaleMatrix,
            zoomMatrix: zoomMatrix,
            normalizeMatrix: that.webGLMatrices.normalizeMatrix,
            alpha: alpha,
            userAlpha: userAlpha,
            texture: texture
        },
        blend: {
            enable: true,
            func: {
                srcRGB: 'one',
                srcAlpha: 'one',
                dstRGB: 'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        },

        count: that.frontBufferPointSize,
        primitive: 'points'
    });

    drawPoints();
}

export function drawContour(that) {

    if (that.gridData == null) {
        console.error('Grid data not initialized');
        return null;
    }

    const contourGroup = that.svg.select(`.contour-group`);

    const gridData1D = [];
    const grid = that.gridData.grid;
    for (const row of grid) {
        for (const item of row) {
            gridData1D.push(item);
        }
    }

    // Linear interpolate the levels to determine the thresholds
    const levels = config.layout.contourLevels;
    const thresholds = [];
    const minValue = Math.min(...gridData1D);
    const maxValue = Math.max(...gridData1D);
    const step = (maxValue - minValue) / levels;
    for (let i = 0; i < levels; i++) {
        thresholds.push(minValue + step * i);
    }

    let contours = d3
        .contours()
        .thresholds(thresholds)
        .size([grid.length, grid[0].length])(gridData1D);

    // Convert the scale of the generated paths
    const contourXScale = d3
        .scaleLinear()
        .domain([0, grid.length])
        .range(that.gridData.xRange);

    const contourYScale = d3
        .scaleLinear()
        .domain([0, grid[0].length])
        .range(that.gridData.yRange);

    contours = contours.map(item => {
        item.coordinates = item.coordinates.map(coordinates => {
            return coordinates.map(positions => {
                return positions.map(point => {
                    return [
                        that.xScale(contourXScale(point[0])),
                        // that.xScale(contourXScale(point[0])) + (that.svgFullSize.width - that.svgFullSize.height) / 2,
                        that.yScale(contourYScale(point[1]))
                    ];
                });
            });
        });
        return item;
    });

    // Create a new color interpolator
    // (starting from white here)
    const colorScaleInterpolator = d3.interpolateLab(
        '#ffffff',
        config.layout['groupColors'][0]
    );
    const colorScale = d3.scaleSequential(
        d3.extent(thresholds),
        d => colorScaleInterpolator(d / 1)
    );

    // Draw the contours
    contourGroup
        .selectAll('path')
        .data(contours.slice(1))
        .join('path')
        .attr('fill', d => colorScale(d.value))
        .attr('d', d3.geoPath());

    return contours;
};


export function drawGroupContour(that, group) {


    if (that.gridData == null || that.gridData.groupGrids == undefined) {
        console.error('Grid data not initialized', that.gridData);
        return null;
    }

    const contourGroup = that.svg.select(`.contour-group-${group}`);

    const gridData1D = [];
    const grid = that.gridData.groupGrids[group];
    for (const row of grid) {
        for (const item of row) {
            gridData1D.push(item);
        }
    }

    // Linear interpolate the levels to determine the thresholds
    const levels = config.layout.contourLevels;
    const thresholds = [];
    const minValue = Math.min(...gridData1D);
    const maxValue = Math.max(...gridData1D);
    const step = (maxValue - minValue) / levels;
    for (let i = 0; i < levels; i++) {
        thresholds.push(minValue + step * i);
    }

    let contours = d3
        .contours()
        .thresholds(thresholds)
        .size([grid.length, grid[0].length])(gridData1D);

    // Convert the scale of the generated paths
    const contourXScale = d3
        .scaleLinear()
        .domain([0, grid.length])
        .range(that.gridData.xRange);

    const contourYScale = d3
        .scaleLinear()
        .domain([0, grid[0].length])
        .range(that.gridData.yRange);

    contours = contours.map(item => {
        item.coordinates = item.coordinates.map(coordinates => {
            return coordinates.map(positions => {
                return positions.map(point => {
                    return [
                        that.xScale(contourXScale(point[0])),
                        // that.xScale(contourXScale(point[0])) + (that.svgFullSize.width - that.svgFullSize.height) / 2,
                        that.yScale(contourYScale(point[1]))
                    ];
                });
            });
        });
        return item;
    });

    // Create a new color interpolator
    // (starting from white here)
    const colorScaleInterpolator = d3.interpolateLab(
        '#ffffff',
        config.layout['groupColors'][that.groupNames?.indexOf(group) || 0]
    );
    const colorScale = d3.scaleSequential(
        d3.extent(thresholds),
        d => colorScaleInterpolator(d / 1)
    );

    // Draw the contours
    contourGroup
        .selectAll('path')
        .data(contours.slice(1))
        .join('path')
        .attr('fill', d => colorScale(d.value))
        .attr('d', d3.geoPath());

    return contours;
};

/**
 * Convert the current zoom transform into a matrix
 * @param zoomTransform D3 zoom transform
 * @returns 1D matrix
 */
const getZoomMatrix = (zoomTransform) => {
    // Transforming the stage space based on the current zoom transform
    const zoomMatrix = [
        [zoomTransform.k, 0, zoomTransform.x],
        [0, zoomTransform.k, zoomTransform.y],
        [0, 0, 1]
    ];
    const zoomMatrix1D = zoomMatrix.flat();
    return zoomMatrix1D;
};

export function updateWebGLBuffers(that, newPoints) {
    // Get the position and color of each new point
    const positions = [];
    const textureCoords = [];

    for (const point of newPoints) {
        positions.push([point.x, point.y]);

        if (that.timeTextureMap === null) {
            if (that.groupNames && point.groupID !== undefined) {
                textureCoords.push([point.groupID / that.groupNames.length, 0]);
            } else {
                textureCoords.push([0, 0]);
            }
        } else {
            if (that.timeTextureMap.has(point.time)) {
                const u =
                    that.timeTextureMap.get(point.time) /
                    (that.timeTextureMap.size - 1);
                textureCoords.push([u, 0.5]);
            } else {
                // The last entry in the texture array is reserved for 'bad' points
                // (e.g., wrong year)
                textureCoords.push([1, 0]);
            }
        }
    }

    // Update the buffer using byte offsets
    that.frontPositionBuffer.subdata(
        positions,
        that.frontBufferPointSize * 2 * 4
    );
    that.frontTextureCoordinateBuffer.subdata(
        textureCoords,
        that.frontBufferPointSize * 2 * 4
    );
    that.frontBufferPointSize += newPoints.length;
}

export function highlightPoint(that, args) {
    const offx = 0;
    const { point, animated } = args;
    if (!anyTrue(that.showPoints)) return;
    if (point === that.hoverPoint) return;
    if (that.hideHighlights) return;

    // Draw the point on the top svg
    const group = that.topSvg.select('g.top-content g.highlights');
    const oldHighlightPoint = group.select('circle.highlight-point');

    // 整体向右进行偏移 

    // Hovering empty space
    if (point === undefined) {
        if (pointMouseleaveTimer !== null) {
            clearTimeout(pointMouseleaveTimer);
            pointMouseleaveTimer = null;
        }

        if (pointMouseenterTimer !== null) {
            clearTimeout(pointMouseenterTimer);
            pointMouseenterTimer = null;
        }

        // Clear the highlight and tooltip in a short delay
        pointMouseleaveTimer = setTimeout(() => {
            that.hoverPoint = null;
            that.tooltipTop.classList.add('hidden');
            oldHighlightPoint.remove();
            pointMouseleaveTimer = null;
        }, 50);

        return;
    }

    // Hovering over a point
    that.hoverPoint = point;
    if (that.$store.state.datasetName == "ImageNet2012ValSet") {
        that.hoverPoint.groupID = 0;
    }

    // that.hoverPoint.groupID = 0;
    // Change the point's text to an image tag if this is an image point


    if (that.gridData && that.gridData.image !== undefined) {
        if (that.gridData.image.imageGroup === that.hoverPoint.groupID) {
            console.log("that.hoverPoint", that.hoverPoint, that.hoverPoint.prompt)

            that.hoverPoint.prompt = `<img class="tooltip-image" src="${that.gridData.image.imageURLPrefix + that.hoverPoint.prompt}">`;
        }
    }



    if (pointMouseleaveTimer !== null) {
        clearTimeout(pointMouseleaveTimer);
        pointMouseleaveTimer = null;
    }

    const highlightRadius = Math.max(
        10 / that.curZoomTransform.k,
        (that.curPointWidth * Math.exp(Math.log(that.curZoomTransform.k) * 0.55)) / that.curZoomTransform.k
    );

    const highlightStroke = 1.2 / that.curZoomTransform.k;
    let curHighlightPoint; // 用于存储当前高亮点的选择器

    // 如果没有高亮点
    if (oldHighlightPoint.empty()) {
        curHighlightPoint = group
            .append('circle')
            .attr('class', 'highlight-point')
            .attr('cx', that.xScale(point.x) + offx)
            .attr('cy', that.yScale(point.y))
            .attr('r', highlightRadius)
            .style('stroke-width', highlightStroke);
    } else {
        // 如果已有高亮点
        curHighlightPoint = oldHighlightPoint;

        if (animated) {
            curHighlightPoint
                .transition()
                .duration(150)
                .attr('cx', that.xScale(point.x) + offx)
                .attr('cy', that.yScale(point.y))
                .attr('r', highlightRadius)
                .style('stroke-width', highlightStroke)
                .on('end', () => {
                    updatePopperTooltip(
                        that.tooltipTop,
                        curHighlightPoint.node(),
                        point.prompt,
                        'top'
                    );
                });
        } else {
            curHighlightPoint
                .attr('cx', that.xScale(point.x) + offx)
                .attr('cy', that.yScale(point.y))
                .attr('r', highlightRadius)
                .style('stroke-width', highlightStroke);

            updatePopperTooltip(
                that.tooltipTop,
                curHighlightPoint.node(),
                point.prompt,
                'top'
            );
        }
    }

    if (pointMouseenterTimer !== null) {
        clearTimeout(pointMouseenterTimer);
    }

    pointMouseenterTimer = setTimeout(() => {
        that.tooltipTop.classList.remove('hidden');
        pointMouseenterTimer = null;
    }, 300);
}

function getCoordinates(nodesIdList, promptPoints) {
    const coordinates = [];
    for (const resultIndex of nodesIdList) {
        const curPoint = promptPoints[resultIndex];
        coordinates.push(curPoint);
    }
    return coordinates;
}

export function drawSearchScatterPlot(that) {
    if (!that.webGLMatrices) {
        throw new Error('webGLMatrices not initialized');
    }

    if (that.$store.state.dataNodeLink.links == null) {
        return null;
    }

    that.searchPointRegl.clear({
        color: [0, 0, 0, 0],
        depth: 1
    });

    // Here are some code for processing data
    let connectData = that.$store.state.dataNodeLink.links;
    let nodeList = that.$store.state.dataNodeLink.nodes;
    let startNode = that.$store.state.dataNodeLink.startNode;
    let searchList = that.$store.state.dataNodeLink.sList;
    let groundTruthList = that.$store.state.dataNodeLink.gList;

    let diffSList = searchList.filter(x => !groundTruthList.includes(x));
    let diffGList = groundTruthList.filter(x => !searchList.includes(x));
    let interList = searchList.filter(x => groundTruthList.includes(x));

    let tracePoints = [];

    for (const resultIndex of nodeList) {
        const curPoint = that.promptPoints[resultIndex.id];
        tracePoints.push(curPoint);
    }

    let edgePositions = [];

    for (const link of connectData) {
        const startPoint = that.promptPoints[link.source];
        const endPoint = that.promptPoints[link.target];

        // 添加边的起点和终点
        if (startPoint && endPoint) {
            edgePositions.push(startPoint.x, startPoint.y, endPoint.x, endPoint.y);
        }
    }


    diffGList = getCoordinates(diffGList, that.promptPoints);
    diffSList = getCoordinates(diffSList, that.promptPoints);
    interList = getCoordinates(interList, that.promptPoints);
    startNode = getCoordinates([startNode], that.promptPoints);


    const curLineWidth = 2.0; // 设置线条宽度
    const lineCount = edgePositions.length / 4; // 每两个顶点表示一条线
    // curPointWidth = Math.min(5, curPointWidth);
    const lineAlpha = 1 / (Math.log(lineCount) / Math.log(500));

    // // Get the current zoom
    const zoomMatrix = getZoomMatrix(that.curZoomTransform);

    // Create a texture array (default 3x1)
    const textureArray = [
        // timePointColorInt (RGBA)
        config.layout.timePointColorInt[0], // R
        config.layout.timePointColorInt[1], // G
        config.layout.timePointColorInt[2], // B
        255, // A

        // Add yellow color (RGBA)
        255, // R
        255, // G
        0,   // B
        255,  // A

        // Add blue color (RGBA)
        0,   // R
        0,   // G
        255, // B
        255, // A

        // Add green color (RGBA)
        0,   // R
        255, // G
        0,   // B
        255, // A



        // secondPointColorInt (RGBA)
        config.layout.secondPointColorInt[0], // R
        config.layout.secondPointColorInt[1], // G
        config.layout.secondPointColorInt[2], // B
        255, // A
    ];

    // Create texture with width 5 and height 1 (now 5 colors)
    const texture = that.searchPointRegl.texture({
        width: 5,
        height: 1,
        data: textureArray,
        format: 'rgba'
    });


    const lineUvs = [];
    for (let i = 0; i < edgePositions / 2; i++) {
        lineUvs.push([0, 0]);
    }

    const drawLines = that.searchPointRegl({
        depth: { enable: false },
        stencil: { enable: false },
        frag: edgeFragmentShader,
        vert: edgeVertexShader,
        attributes: {
            position: edgePositions,
            textureCoord: lineUvs
        },

        uniforms: {
            dataScaleMatrix: that.webGLMatrices.dataScaleMatrix,
            zoomMatrix: zoomMatrix,
            normalizeMatrix: that.webGLMatrices.normalizeMatrix,
            LineWidth: curLineWidth,
            alpha: lineAlpha,
            userAlpha: -1,
            texture: texture

        },

        blend: {
            enable: true,
            func: {
                srcRGB: 'one',
                srcAlpha: 'one',
                dstRGB: 'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        },

        count: lineCount * 2,
        primitive: 'lines',

    });

    drawLines();

    // Collect position and color for each point
    const allpointPositions = [];
    const allpointUvs = [];

    for (const point of tracePoints) {
        allpointPositions.push([point.x, point.y]);
        allpointUvs.push([0.1, 0.1]);
    }
    // Adjust point width based on the number of points to draw
    const allpointCount = allpointPositions.length;

    // Logarithmic regression by fitting the following three points
    // https://keisan.casio.com/exec/system/14059930226691
    // [(6e4, 2), (3e5, 1), [1.8e6, 0.5]]
    const a = 6.71682071;
    const b = -0.437974871;
    let curPointWidth =
        a +
        b *
        Math.log(
            config.layout.scatterDotRadius *
            (that.svgFullSize.height / 760) *
            allpointCount
        );

    const pointAlpha = 1 / (Math.log(allpointCount) / Math.log(500));

    const drawAllPoints = that.searchPointRegl({
        depth: { enable: false }, // 禁用深度测试
        stencil: { enable: false }, // 禁用模板缓冲区
        frag: fragmentShader, // 片段着色器
        vert: vertexShader, // 顶点着色器

        attributes: {
            position: allpointPositions, // 动态传入的 positions
            textureCoord: allpointUvs // 动态传入的 uvs
        },

        uniforms: {
            pointWidth: curPointWidth,
            dataScaleMatrix: that.webGLMatrices.dataScaleMatrix,
            zoomMatrix: zoomMatrix, // 动态传入的 zoomMatrix
            normalizeMatrix: that.webGLMatrices.normalizeMatrix,
            alpha: pointAlpha, // 透明度
            userAlpha: -1, // 用户自定义透明度
            texture: texture // 传递纹理数据
        },

        blend: {
            enable: true, // 启用混合
            func: {
                srcRGB: 'one', // RGB源混合因子
                srcAlpha: 'one', // Alpha源混合因子
                dstRGB: 'one minus src alpha', // RGB目标混合因子
                dstAlpha: 'one minus src alpha' // Alpha目标混合因子
            }
        },

        count: allpointCount, // 动态传入的点数
        primitive: 'points' // 绘制点
    });

    drawAllPoints();


    // Collect position and color for each point
    const interPositions = [];
    const interPointUvs = [];

    for (const point of interList) {
        interPositions.push([point.x, point.y]);
        interPointUvs.push([1.0, 1.0]);
    }

    // Adjust point width based on the number of points to draw
    const interPointCount = interPositions.length;
    const drawInterPoints = that.searchPointRegl({
        depth: { enable: false }, // 禁用深度测试
        stencil: { enable: false }, // 禁用模板缓冲区
        frag: fragmentShader, // 片段着色器
        vert: vertexShader, // 顶点着色器

        attributes: {
            position: interPositions, // 动态传入的 positions
            textureCoord: interPointUvs // 动态传入的 uvs
        },

        uniforms: {
            pointWidth: curPointWidth,
            dataScaleMatrix: that.webGLMatrices.dataScaleMatrix,
            zoomMatrix: zoomMatrix, // 动态传入的 zoomMatrix
            normalizeMatrix: that.webGLMatrices.normalizeMatrix,
            alpha: pointAlpha, // 透明度
            userAlpha: -1, // 用户自定义透明度
            texture: texture // 传递纹理数据
        },

        blend: {
            enable: true, // 启用混合
            func: {
                srcRGB: 'one', // RGB源混合因子
                srcAlpha: 'one', // Alpha源混合因子
                dstRGB: 'one minus src alpha', // RGB目标混合因子
                dstAlpha: 'one minus src alpha' // Alpha目标混合因子
            }
        },

        count: interPointCount, // 动态传入的点数
        primitive: 'points' // 绘制点
    });
    if (interList.length > 0) {
        drawInterPoints();
    }


    // Collect position and color for each point
    const diffGPositions = [];
    const diffGPointUvs = [];

    for (const point of diffGList) {
        diffGPositions.push([point.x, point.y]);
        diffGPointUvs.push([0.3, 0.3]);
    }

    // Adjust point width based on the number of points to draw
    const diffGPointCount = diffGPositions.length;

    const drawDiffGPoints = that.searchPointRegl({
        depth: { enable: false }, // 禁用深度测试
        stencil: { enable: false }, // 禁用模板缓冲区
        frag: fragmentShader, // 片段着色器
        vert: vertexShader, // 顶点着色器

        attributes: {
            position: diffGPositions, // 动态传入的 positions
            textureCoord: diffGPointUvs // 动态传入的 uvs
        },

        uniforms: {
            pointWidth: curPointWidth,
            dataScaleMatrix: that.webGLMatrices.dataScaleMatrix,
            zoomMatrix: zoomMatrix, // 动态传入的 zoomMatrix
            normalizeMatrix: that.webGLMatrices.normalizeMatrix,
            alpha: pointAlpha, // 透明度
            userAlpha: -1, // 用户自定义透明度
            texture: texture // 传递纹理数据
        },

        blend: {
            enable: true, // 启用混合
            func: {
                srcRGB: 'one', // RGB源混合因子
                srcAlpha: 'one', // Alpha源混合因子
                dstRGB: 'one minus src alpha', // RGB目标混合因子
                dstAlpha: 'one minus src alpha' // Alpha目标混合因子
            }
        },

        count: diffGPointCount, // 动态传入的点数
        primitive: 'points' // 绘制点
    });
    if (diffGList.length > 0) {
        drawDiffGPoints();
    }


    // Collect position and color for each point
    const diffSPositions = [];
    const diffSPointUvs = [];

    for (const point of diffSList) {
        diffSPositions.push([point.x, point.y]);
        diffSPointUvs.push([0.8, 0.8]);
    }

    // Adjust point width based on the number of points to draw
    const diffSPointCount = diffSPositions.length;


    const drawDiffSPoints = that.searchPointRegl({
        depth: { enable: false }, // 禁用深度测试
        stencil: { enable: false }, // 禁用模板缓冲区
        frag: fragmentShader, // 片段着色器
        vert: vertexShader, // 顶点着色器

        attributes: {
            position: diffSPositions, // 动态传入的 positions
            textureCoord: diffSPointUvs // 动态传入的 uvs
        },

        uniforms: {
            pointWidth: curPointWidth,
            dataScaleMatrix: that.webGLMatrices.dataScaleMatrix,
            zoomMatrix: zoomMatrix, // 动态传入的 zoomMatrix
            normalizeMatrix: that.webGLMatrices.normalizeMatrix,
            alpha: pointAlpha, // 透明度
            userAlpha: -1, // 用户自定义透明度
            texture: texture // 传递纹理数据
        },

        blend: {
            enable: true, // 启用混合
            func: {
                srcRGB: 'one', // RGB源混合因子
                srcAlpha: 'one', // Alpha源混合因子
                dstRGB: 'one minus src alpha', // RGB目标混合因子
                dstAlpha: 'one minus src alpha' // Alpha目标混合因子
            }
        },

        count: diffSPointCount, // 动态传入的点数
        primitive: 'points' // 绘制点
    });
    if (diffSList.length > 0) {
        drawDiffSPoints();
    }

    // Collect position and color for each point
    const startNodePositions = [];
    const startNodePointUvs = [];

    for (const point of startNode) {
        startNodePositions.push([point.x, point.y]);
        startNodePointUvs.push([0.3, 0.3]);
    }

    // Adjust point width based on the number of points to draw
    const startNodePointCount = startNodePositions.length;


    const drawstartNodePoints = that.searchPointRegl({
        depth: { enable: false }, // 禁用深度测试
        stencil: { enable: false }, // 禁用模板缓冲区
        frag: fragmentShader, // 片段着色器
        vert: vertexShader, // 顶点着色器

        attributes: {
            position: startNodePositions, // 动态传入的 positions
            textureCoord: startNodePointUvs // 动态传入的 uvs
        },

        uniforms: {
            pointWidth: curPointWidth,
            dataScaleMatrix: that.webGLMatrices.dataScaleMatrix,
            zoomMatrix: zoomMatrix, // 动态传入的 zoomMatrix
            normalizeMatrix: that.webGLMatrices.normalizeMatrix,
            alpha: pointAlpha, // 透明度
            userAlpha: -1, // 用户自定义透明度
            texture: texture // 传递纹理数据
        },

        blend: {
            enable: true, // 启用混合
            func: {
                srcRGB: 'one', // RGB源混合因子
                srcAlpha: 'one', // Alpha源混合因子
                dstRGB: 'one minus src alpha', // RGB目标混合因子
                dstAlpha: 'one minus src alpha' // Alpha目标混合因子
            }
        },

        count: startNodePointCount, // 动态传入的点数
        primitive: 'points' // 绘制点
    });
    if (startNode.length > 0) {
        drawstartNodePoints();
    }


}

export function drawSearchScatterPlot2(that) {
    if (!that.webGLMatrices) {
        throw Error('webGLMatrices not initialized');
    }

    // Clear the WebGL context
    that.searchPointRegl.clear({
        color: [0, 0, 0, 0],
        depth: 1
    });

    // Adjust point width based on the number of points to draw
    console.log("that.searchPointResults2", that.searchPointResults2)
    const pointCount = that.searchPointResults2.length;
    console.log("that.searchPointResults2", pointCount)

    // Logarithmic regression parameters
    const a = 6.71682071;
    const b = -0.437974871;
    let curPointWidth = a + b * Math.log(config.layout.scatterDotRadius * (that.svgFullSize.height / 760) * pointCount);
    curPointWidth = Math.min(5, curPointWidth);
    const alpha = 1 / (Math.log(pointCount) / Math.log(500));

    // Get the current zoom matrix
    const zoomMatrix = getZoomMatrix(that.curZoomTransform);

    // Create a texture array for point colors
    const textureArray = [
        config.layout.timePointColorInt[0],
        config.layout.timePointColorInt[1],
        config.layout.timePointColorInt[2],
        255,
        config.layout.secondPointColorInt[0],
        config.layout.secondPointColorInt[1],
        config.layout.secondPointColorInt[2],
        255,
        255,
        255,
        255,
        0
    ];

    const texture = that.searchPointRegl.texture({
        width: 3,
        height: 1,
        data: textureArray,
        format: 'rgba'
    });

    // Collect positions and texture coordinates for each point
    const positions = [];
    const uvs = [];
    console.log("that.searchPointResults222222", that.searchPointResults2)

    for (const point of that.searchPointResults2) {
        positions.push([point.x, point.y]);
        uvs.push([0, 0]);
    }

    const drawPoints = that.searchPointRegl({
        depth: { enable: false },
        stencil: { enable: false },
        frag: fragmentShader,
        vert: vertexShader,
        attributes: {
            position: positions,
            textureCoord: uvs
        },
        uniforms: {
            pointWidth: curPointWidth,
            dataScaleMatrix: that.webGLMatrices.dataScaleMatrix,
            zoomMatrix: zoomMatrix,
            normalizeMatrix: that.webGLMatrices.normalizeMatrix,
            alpha: alpha,
            userAlpha: -1,
            texture: texture
        },
        blend: {
            enable: true,
            func: {
                srcRGB: 'one',
                srcAlpha: 'one',
                dstRGB: 'one minus src alpha',
                dstAlpha: 'one minus src alpha'
            }
        },
        count: pointCount,
        primitive: 'points'
    });

    drawPoints();

    console.log("that.searchPointResults3333", that.searchPointResults2)
}

export const anyTrue = (items) => items.reduce((a, b) => a || b);
export const allTrue = (items) => items.reduce((a, b) => a && b);