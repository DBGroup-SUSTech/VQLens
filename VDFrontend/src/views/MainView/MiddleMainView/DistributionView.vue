<template>
    <div class="mapview-class">
        <div id="popper-tooltip-top" class="popper-tooltip hidden" role="tooltip">
            <span class="popper-content"></span>
            <div class="popper-arrow"></div>
        </div>

        <div id="popper-tooltip-bottom" class="popper-tooltip hidden" role="tooltip">
            <span class="popper-content"></span>
            <div class="popper-arrow"></div>
        </div>

        <div class="distribution-main" ref="distributionMain">
        </div>

    </div>

</template>


<script>
import { mapState } from "vuex";
import { config } from '@/config/config';
import createRegl from 'regl';
import d3 from '../../../utils/d3-import';
import { anyTrue, allTrue } from '../../../components/Embedding/Embedding';

import LoaderWorker from '../../../components/Embedding/workers/loader.worker.js';
import TreeWorker from '../../../components/Embedding/workers/tree.worker.js';
import SeacherWorker from '../../../components/Embedding/workers/search.worker.js';

import * as Embedder from '../../../components/Embedding/Embedding';
import * as PointDrawer from '../../../components/Embedding/EmbeddingPointWebGL';
import * as Labeler from '../../../components/Embedding/EmbeddingLabel';
import { HOVER_RADIUS } from '../../../utils/utils';

export default {
    name: "DistributionView",
    components: {

    },
    data() {
        return {
            component: null,

            svg: null,
            svgFullSize: { width: 0, height: 0 },
            svgSize: { width: 0, height: 0 },
            svgPadding: { top: 0, bottom: 0, left: 0, right: 0 },

            topSvg: null,
            topicCanvases: [],

            // points
            pointCanvas: null,
            pointRegl: null,
            frontPositionBuffer: null,
            frontTextureCoordinateBuffer: null,
            frontBufferPointSize: 0,

            // search trace
            searchPointCanvas: null,
            searchPointRegl: null,
            searchPointPositionBuffer: null,
            searchPointTextureCoordinateBuffer: null,
            searchPointResults: { "tracePoints": [], "connectData": [], "startNode": [], "diffSList": [], "diffGList": [], "interList": [] },

            // search table
            searchPointCanvas2: null,
            searchPointRegl2: null,
            searchPointPositionBuffer2: null,
            searchPointTextureCoordinateBuffer2: null,
            searchPointResults2: [],

            // Tooltips
            tooltipTop: null,
            tooltipBottom: null,
            hoverPoint: null,

            xScale: d3.scaleLinear(),
            yScale: d3.scaleLinear(),

            // zooming
            zoom: null, // d3.ZoomBehavior<HTMLElement, unknown>
            initZoomTransform: null,
            curZoomTransform: d3.zoomIdentity,
            curZoomLevel: 1,

            // interaction
            lastMouseClientPosition: null,
            hideHighlights: false,

            // user settings
            showContours: [true],   // 先给一些默认的值出来
            showGrid: true,
            showPoints: [true],
            showPoints_back: false,
            showLabel: false,
            showTrace: true,

            // data
            dataURLs: null,
            promptPoints: [],
            gridData: null,
            tileData: null,
            contours: null,
            groupContour: null,
            contoursInitialized: false,
            loadedPointCount: 1,

            // Time
            timeTextureMap: null,

            // Group
            groupNames: [],

            // search
            completedSearchQueryID: null,

            // scatter plot
            lastRefillID: 0,
            lsatRefillTime: 0,
            webGLMatrices: null,
            curPointWidth: 1,

            // display labels
            topicLevelTrees: new Map(),
            lastGridTreeLevels: [],

            // Web workers
            loaderWorker: null,
            treeWorker: null,

            // store
            footerStoreValue: { xScale: null, embeddingName: null, numPoints: null },


            // other top
            DEBUG: config.debug,

            handledFooterMessageID: 0,


            // canvas points dis
            pointsDict: [{}],


        };
    },
    mounted() {

        this.init();

    },
    methods: {
        init() {

            const dag = this.$refs.distributionMain;
            this.svgFullSize.height = dag.clientHeight;
            this.svgFullSize.width = dag.clientWidth;

            console.log("对dis 的大小进行输出", this.svgFullSize.height, this.svgFullSize.width)

            this.component = d3.select('.distribution-main');

            // init worker
            this.initWorker();

            // init svg and canvas
            const squareCanvasWidth = Math.min(
                this.svgFullSize.width - this.svgPadding.left - this.svgPadding.right,
                this.svgFullSize.height - this.svgPadding.top - this.svgPadding.bottom
            );

            this.svgSize = {
                width: squareCanvasWidth,
                height: squareCanvasWidth
            };

            this.initTopSvg();
            this.initCanvas();
            this.initSVGGroups();

            // Register zoom
            this.zoom = d3
                .zoom()
                .extent([
                    [0, 0],
                    [this.svgSize.width, this.svgSize.height]
                ])
                .scaleExtent([config.layout.zoomScale[0], config.layout.zoomScale[1]])
                .interpolate(d3.interpolate)
                .on('zoom', (g) => {
                    (async () => {
                        await this.zoomed(g);
                    })();
                })
                .on('end', () => this.zoomEnded());

            this.topSvg.call(this.zoom).on('dblclick.zoom', null);

            this.tooltipTop = document.querySelector('#popper-tooltip-top');
            this.tooltipBottom = document.querySelector('#popper-tooltip-bottom');

            // init data
            this.initData().then(() => {

                Embedder.displayGroupChanged(this, "Image");


            });

        },
        async initData() {

            const gridData = await d3.json(this.$store.state.dataURLs.grid);
            if (gridData === undefined) {
                console.log('Fail to load grid data');
            }

            this.gridData = gridData;

            // Initialize the data scales
            const xRange = this.gridData.xRange;
            const yRange = this.gridData.yRange;

            let xLength = xRange[1] - xRange[0];
            let yLength = yRange[1] - yRange[0];

            if (!this.gridData.padded) {
                // Add padding for the data
                if (xLength < yLength) {
                    yRange[0] -= yLength / 50;
                    yRange[1] += yLength / 50;
                    yLength = yRange[1] - yRange[0];

                    xRange[0] -= (yLength - xLength) / 2;
                    xRange[1] += (yLength - xLength) / 2;
                } else {
                    // Add padding for the data
                    xRange[0] -= xLength / 50;
                    xRange[1] += xLength / 50;
                    xLength = xRange[1] - xRange[0];

                    yRange[0] -= (xLength - yLength) / 2;
                    yRange[1] += (xLength - yLength) / 2;
                }
            }

            this.xScale = d3
                .scaleLinear()
                .domain(xRange)
                .range([0, this.svgSize.width]);

            this.yScale = d3
                .scaleLinear()
                .domain(yRange)
                .range([this.svgSize.height, 0]);

            PointDrawer.drawContour(this);  // 这个一般是指刚刚选中的时候直接对全部数据，即没有 group 数据的绘制

            // Create group related structures if the data has groups
            if (this.gridData.groupGrids && this.gridData.groupNames.length > 0) {
                this.groupNames = this.gridData.groupNames;
                const umapGroup = this.svg.select('g.umap-group');

                // Adjust the first contour's name
                this.showContours = [];
                this.showPoints = [];
                this.groupContours = [];

                for (let i = 0; i < this.groupNames.length; i++) {
                    // Add groups to the control states
                    // (Default is to show the first group only)
                    this.showContours.push(i === 0);    // 这里的意思是只有第一个组是可以显示的，因为默认展示第一个组
                    this.showPoints.push(i === 0);

                    // Add contour elements for other groups
                    const name = this.groupNames[i];
                    umapGroup
                        .append('g')
                        .attr('class', `contour-group-generic contour-group-${name}`)
                        .classed('hidden', i !== 0);

                    // Drw the group contour
                    const curContour = PointDrawer.drawGroupContour(this, name);
                    if (curContour !== null) {
                        this.groupContours.push(curContour);
                    }
                }
            }

            // Tell the tree worker to prepare to add points to the tree
            const groupIDs = [];

            if (this.groupNames) {
                for (let i = 0; i < this.groupNames.length; i++) {
                    groupIDs.push(i);
                }
            }

            const treeMessage = {
                command: 'initQuadtree',
                payload: {
                    xRange: xRange,
                    yRange: yRange,
                    groupIDs: groupIDs,
                    times: []
                }
            };

            this.treeWorker.postMessage(treeMessage);

            for (const level of Object.keys(this.gridData.topic.data)) {
                const tree = d3
                    .quadtree()
                    .x(function (d) { return d[0]; })
                    .y(function (d) { return d[1]; })
                    .addAll(this.gridData.topic.data[level]);
                this.topicLevelTrees.set(parseInt(level, 10), tree);
            }

            // 之后是对 topic label 的绘制，之后进行添加


            // Initialize WebGL matrices once we have the scales
            PointDrawer.initWebGLMatrices(this);
            PointDrawer.initWebGLBuffers(this);

        },
        initCanvas() {

            const discomponent = this.$refs.distributionMain;

            this.searchPointCanvas = d3.select(discomponent)
                .append('canvas')
                .attr('class', 'search-point-canvas')
                .classed('hidden', true)
                .attr('width', this.svgFullSize.width)
                .attr('height', this.svgFullSize.height);

            this.searchPointRegl = createRegl(this.searchPointCanvas?.node());

            this.pointCanvas = d3.select(discomponent)
                .append('canvas')
                .attr('class', 'embedding-canvas')
                .attr('width', this.svgFullSize.width)
                .attr('height', this.svgFullSize.height);

            this.pointRegl = createRegl(this.pointCanvas?.node());

            this.topicCanvases = [];
            for (const pos of ['top', 'bottom']) {
                this.topicCanvases.push(
                    d3
                        .select(discomponent)
                        .append('canvas')
                        .attr('class', `topic-grid-canvas ${pos}`)
                        .attr('width', `${this.svgFullSize.width}px`)
                        .attr('height', `${this.svgFullSize.height}px`)
                        .classed('hidden', !this.showGrid)
                );
            }

        },
        initSVGGroups() {

            this.svg = this.component.append('svg')
                .attr('class', "embedding-svg")
                .attr('width', this.svgFullSize.width)
                .attr('height', this.svgFullSize.height);


            const umapGroup = this.svg
                .append('g')
                .attr('class', 'umap-group')
                .attr(
                    'transform',
                    `translate(${this.svgPadding.left}, ${this.svgPadding.top})`
                );

            umapGroup
                .append('g')
                .attr('class', 'contour-group')
                .classed('hidden', !this.showContours);

        },
        initTopSvg() {

            // 创建一个 SVG 元素并设置其属性
            this.topSvg = this.component.append('svg')
                .attr('class', "top-svg")
                .attr('width', `${this.svgFullSize.width}px`)
                .attr('height', `${this.svgFullSize.height}px`) // 设置高度
                .on('pointermove', e => this.mousemoveHandler(e))
                .on('mouseleave', () => {
                    PointDrawer.highlightPoint(this, { point: undefined, animated: false });
                    Labeler.mouseoverLabel(this, null, null);
                })
                .attr(
                    'transform',
                    `translate(${this.svgPadding.left}, ${this.svgPadding.top})`
                );


            const topGroup = this.topSvg.append('g').attr('class', 'top-group');

            topGroup
                .append('rect')
                .attr('class', 'mouse-track-rect')
                .attr('width', this.svgFullSize.width)
                .attr('height', this.svgFullSize.height);

            const topContent = topGroup.append('g').attr('class', 'top-content');

            topContent.append('g').attr('class', 'topics-bottom');
            topContent
                .append('g')
                .attr('class', 'topics')
                .classed('hidden', !this.showLabel);
            topContent.append('g').attr('class', 'topics-top');
            topContent.append('g').attr('class', 'highlights');

        },
        zoomed(e) {

            const transform = e.transform;
            const scaleChanged = this.curZoomTransform.k !== transform.k;
            this.curZoomTransform = transform;

            // === Task (1) ===
            // Transform the SVG elements
            this.svg.select('.umap-group').attr('transform', transform.toString());

            // Transform the top SVG elements
            this.topSvg
                .select('.top-group')
                .attr('transform', transform.toString());

            // Transform the visible canvas elements
            console.log("对 showPoints 进行输出", this.showPoints)
            if (anyTrue(this.showPoints)) {
                if (this.frontPositionBuffer && this.frontTextureCoordinateBuffer) {
                    PointDrawer.drawScatterPlot(this);
                }
            }

            // Transform the search scatter plot
            if (this.showTrace) {

                console.log("trace 是否会进行展示", this.showTrace)

                this.searchPointCanvas.classed('hidden', false);
                this.pointCanvas.classed('faded', true);

                PointDrawer.drawSearchScatterPlot(this);

            }

            if (this.searchPointResults2.length > 0) {

                this.searchPointCanvas.classed('hidden', false);
                this.pointCanvas.classed('faded', true);

                PointDrawer.drawSearchScatterPlot2(this);

            }

            if (this.showGrid) {
                Labeler.redrawTopicGrid(this, null);
            }


        },
        // Event handler for zoom ended
        zoomEnded() {
            console.log("svg zoom end !!!")
        },
        initWorker() {
            // Initialize the web worker to load data and deal with the quadtree
            this.loaderWorker = new LoaderWorker();
            this.loaderWorker.onmessage = (e) => {
                this.loaderWorkerMessageHandler(e);
            };

            this.treeWorker = new TreeWorker();
            this.treeWorker.onmessage = (e) => {
                this.treeWorkerMessageHandler(e);
            };

            // this.searchWorker = new SearchWorker();
            // this.searchWorker.onmessage = (e) => {
            //     this.searchWorkerMessageHandler(e);
            // };
        },
        loaderWorkerMessageHandler(e) {
            switch (e.data.command) {
                case 'transferLoadData': {
                    // Add these points to the quadtree ASAP
                    const treeMessage = {
                        command: 'updateQuadtree',
                        payload: {
                            points: e.data.payload.points
                        }
                    };
                    this.treeWorker.postMessage(treeMessage);

                    if (e.data.payload.isFirstBatch) {

                        // Add the first batch points
                        this.promptPoints = e.data.payload.points;


                        PointDrawer.initWebGLBuffers(this);
                        if (anyTrue(this.showPoints)) {
                            PointDrawer.drawScatterPlot(this);
                        }

                        // Add the points to the search index
                        const searchMessage = {
                            command: 'addPoints',
                            payload: {
                                points: e.data.payload.points
                            }
                        };
                        // this.searchWorker.postMessage(searchMessage);
                    } else {
                        // Batches after the first batch
                        // Add the points to the prompt point list
                        const newPoints = e.data.payload.points;
                        for (const point of newPoints) {
                            this.promptPoints.push(point);
                        }

                        // Add the points to the search index
                        // const searchMessage = {
                        //     command: 'addPoints',
                        //     payload: {
                        //         points: newPoints
                        //     }
                        // };
                        // this.searchWorker.postMessage(searchMessage);

                        // Add the new points to the WebGL buffers
                        PointDrawer.updateWebGLBuffers(this, newPoints);
                        if (anyTrue(this.showPoints)) {
                            PointDrawer.drawScatterPlot(this);
                        }

                        if (e.data.payload.isLastBatch) {
                            console.log('Finished loading all data.');

                            // console.log("对 this.prompt 的大小进行", this.promptPoints)
                            this.getPointsDis();
                        }


                    }

                    // Update the data point count
                    this.loadedPointCount = e.data.payload.loadedPointCount;

                    // Update the footer
                    this.footerStoreValue.numPoints = this.promptPoints.length;
                    // this.footerStore.set(this.footerStoreValue);
                    break;
                }

                default: {
                    console.error('Unknown message', e.data.command);
                    break;
                }
            }
        },

        treeWorkerMessageHandler(e) {
            switch (e.data.command) {
                case 'finishInitQuadtree': {
                    // Tell the loader worker to start loading data
                    // (need to wait to set up the quadtree to avoid racing)
                    const message = {
                        command: 'startLoadData',
                        payload: { url: this.$store.state.dataURLs.point }
                    };
                    this.loaderWorker.postMessage(message);
                    break;
                }

                case 'finishQuadtreeSearch': {
                    if (this.lastMouseClientPosition === null) {
                        throw new Error('lastMouseClientPosition is null');
                    }
                    // Check if the closest point is relatively close to the mouse
                    const closestPoint = structuredClone(
                        e.data.payload.point
                    );
                    const screenPointX = this.curZoomTransform.applyX(
                        this.xScale(closestPoint.x)
                    );
                    const screenPointY = this.curZoomTransform.applyY(
                        this.yScale(closestPoint.y)
                    );

                    const distance = Math.max(
                        Math.abs(screenPointX - this.lastMouseClientPosition.x),
                        Math.abs(screenPointY - this.lastMouseClientPosition.y)
                    );

                    const highlightRadius = Math.max(
                        10 / this.curZoomTransform.k,
                        (config.layout.scatterDotRadius *
                            Math.exp(Math.log(this.curZoomTransform.k) * 0.55)) /
                        this.curZoomTransform.k
                    );

                    // Highlight the point if it is close enough to the mouse
                    const curHoverRadius = Math.max(
                        HOVER_RADIUS,
                        highlightRadius * this.curZoomTransform.k
                    );

                    if (distance <= curHoverRadius) {
                        PointDrawer.highlightPoint(this, { point: closestPoint, animated: false });
                    } else {
                        PointDrawer.highlightPoint(this, { point: undefined, animated: false });
                    }
                    break;
                }


                case 'finishQuadtreeSearchById': {

                    // Check if the closest point is relatively close to the mouse
                    const closestPoint = structuredClone(
                        e.data.payload.point
                    );
                    const screenPointX = this.curZoomTransform.applyX(
                        this.xScale(closestPoint.x)
                    );
                    const screenPointY = this.curZoomTransform.applyY(
                        this.yScale(closestPoint.y)
                    );

                    const highlightRadius = Math.max(
                        10 / this.curZoomTransform.k,
                        (config.layout.scatterDotRadius *
                            Math.exp(Math.log(this.curZoomTransform.k) * 0.55)) /
                        this.curZoomTransform.k
                    );

                    // Highlight the point if it is close enough to the mouse
                    const curHoverRadius = Math.max(
                        HOVER_RADIUS,
                        highlightRadius * this.curZoomTransform.k
                    );

                    if (e.data.payload.point) {
                        PointDrawer.highlightPoint(this, { point: closestPoint, animated: false });
                    } else {
                        PointDrawer.highlightPoint(this, { point: undefined, animated: false });
                    }
                    break;
                }



                default: {
                    console.error('Unknown message', e.data.command);
                    break;
                }
            }
        },

        searchWorkerMessageHandler(e) {
            switch (e.data.command) {
                case 'finishQuery': {
                    const { resultIndexes } = e.data.payload;
                    const resultPoints = [];

                    for (const resultIndex of resultIndexes) {
                        const curPoint = this.promptPoints[resultIndex];
                        resultPoints.push(curPoint);
                    }

                    // Update the search panel
                    // this.searchBarStoreValue.results = resultPoints;
                    // this.searchBarStoreValue.shown = true;
                    // this.searchBarStore.set(this.searchBarStoreValue);

                    // Draw the scatter plot
                    this.searchPointCanvas.classed('hidden', false);
                    this.searchPointResults = resultPoints;
                    PointDrawer.drawSearchScatterPlot(this);
                    break;
                }

                default: {
                    console.error('Unknown message', e.data.command);
                    break;
                }
            }
        },

        mouseoverPoint(x, y) {
            // Invert to the stage scale => invert to the data scale
            const dataX = this.xScale.invert(this.curZoomTransform.invertX(x));
            const dataY = this.yScale.invert(this.curZoomTransform.invertY(y));

            // Let the worker to search the closest point in a radius
            let groupID = -1;

            if (this.groupNames) {
                if (allTrue(this.showPoints)) {
                    groupID = -1;
                } else {
                    // TODO: Need a better way to search slices of groups for multi groups
                    for (let i = 0; i < this.showPoints.length; i++) {
                        if (this.showPoints[i]) {
                            groupID = i;
                            break;
                        }
                    }
                }
            }

            const message = {
                command: 'startQuadtreeSearch',
                payload: {
                    x: dataX,
                    y: dataY,
                    time: this.timeInspectMode && this.curTime ? this.curTime : '',
                    groupID: groupID,
                    method: null
                }
            };
            this.treeWorker.postMessage(message);
        },

        mousemoveHandler(e) {
            // Show tooltip when mouse over a data point on canvas
            // We need to use color picking to figure out which point is hovered over
            const x = e.offsetX;
            const y = e.offsetY;
            this.lastMouseClientPosition = { x: x, y: y };

            // Show point highlight
            if (anyTrue(this.showPoints) && !this.hideHighlights) {
                this.mouseoverPoint(x, y);
            }

            // Show labels
            if (!this.hideHighlights) {
                Labeler.mouseoverLabel(this, x, y);
            }
        },

        getCurZoomBox() {
            const box = {
                x: this.curZoomTransform.invertX(0),
                y: this.curZoomTransform.invertY(0),
                width: Math.abs(
                    this.curZoomTransform.invertX(this.svgFullSize.width) -
                    this.curZoomTransform.invertX(0)
                ),
                height: Math.abs(
                    this.curZoomTransform.invertY(this.svgFullSize.height) -
                    this.curZoomTransform.invertY(0)
                )
            };
            return box;
        },
        getSearchTraceData() {

            // 这里主要是分为三种数据

            // 1. 一种是 node-link 数据
            // 2.一种是搜索的结果 {"gt not search": [], "search&gt": [], "search not gt": []}

            // const resultPoints = [];

            // for (const resultIndex of resultIndexes) {
            //     const curPoint = this.promptPoints[resultIndex];
            //     resultPoints.push(curPoint);
            // }

            // Draw the scatter plot
            this.searchPointCanvas.classed('hidden', false);
            this.pointCanvas.classed('faded', true);
            // this.searchPointResults = resultPoints;
            PointDrawer.drawSearchScatterPlot(this);

        },
        getSearchByIdResult(selectedNode) {
            // 首先，我们应该获取该 id node 的数据坐标
            console.log("pos-----------", this.promptPoints[selectedNode]);

            const dataX = this.promptPoints[selectedNode].x;
            const dataY = this.promptPoints[selectedNode].y;

            // Let the worker to search the closest point in a radius
            let groupID = -1;

            if (this.groupNames) {
                if (allTrue(this.showPoints)) {
                    groupID = -1;
                } else {
                    // TODO: Need a better way to search slices of groups for multi groups
                    for (let i = 0; i < this.showPoints.length; i++) {
                        if (this.showPoints[i]) {
                            groupID = i;
                            break;
                        }
                    }
                }
            }

            const message = {
                command: 'startQuadtreeSearchById',
                payload: {
                    point: this.promptPoints[selectedNode],
                    method: 'id'
                }
            };
            this.treeWorker.postMessage(message);
        },
        getPointsDis() {

            // 这里是否执行该函数！！！
            console.log("是否执行该函数！！！   dis", this.promptPoints)

            const pairPoints = [96525, 108791, 166518, 267176, 33103, 165549, 203193, 290725, 25731, 113572, 141181, 204376, 284997, 222524, 128324, 156231, 205478, 65275, 92693, 2609, 18517, 39219, 290535, 153897, 234501, 230064, 132706, 232534, 20106, 51369, 181971, 279546, 169313, 129455, 103872, 177641, 53790, 82080, 11950, 285777, 120341, 210428, 103481, 264413, 113056, 152719, 45621, 180558, 176928, 250723, 116622, 128458, 36924, 16817, 259438, 279062, 51396, 101666, 33561, 258777, 157548, 142826, 169862, 160716, 209716, 101040, 183063, 107639, 14869, 114479, 118693, 154047, 200534, 60525, 263843, 185383, 82329, 41903, 252541, 286431, 265292, 153150, 39432, 276085, 120819, 142210, 98553, 64439, 256844, 71370, 22427, 49592, 228182, 120339, 29153, 230946, 299630, 116558, 250299, 125909, 216661, 288813, 48003, 117204, 192909, 187202, 215129, 273241, 138807, 196661, 26875, 79750, 104866, 45695, 204431, 231573, 76216, 102253, 125634, 251827, 247382, 81156, 57798, 34194, 87647, 186840, 79844, 295326, 256396, 32080, 10534, 200505, 273922, 33574, 8125, 8366, 291137, 145952, 98829, 39600, 242407, 101295, 238727, 185926, 201797, 62769, 182167, 225255, 269142, 5048, 17984, 260328, 108197, 67602, 2789, 291329, 36452, 158003, 181298, 194478, 208707, 47127, 223622, 200454, 226092, 3444, 227919, 125815, 96932, 124366, 41067, 240765, 109817, 267532, 143381, 200455, 213220, 64279, 135312, 212277, 89614, 19436, 266613, 56906, 6355, 155155, 122551, 283878, 15843, 189202, 293525, 71544, 61158, 126463, 113547, 230063, 58517, 225333, 148556, 243662, 228835, 16921, 241481, 270759, 239354, 223058, 298963, 18739, 295330, 186860, 38381, 162262, 207826, 238198, 55402, 92327, 253749, 62054, 229492, 20965, 280649, 44071, 47853, 192277, 161674, 58113, 18659, 126469, 269440, 179573, 273425, 150322, 46184, 159308, 92535, 191964, 269188, 108708, 172607, 41916, 194217, 242881, 208102, 154381, 20667, 27823, 29086, 276074, 11601, 54928, 1422, 183569, 157972, 184539, 122516, 113357, 79314, 262263, 54208, 277314, 243997, 90137, 275614, 16712, 125488, 165567, 27224, 251775, 110452, 20451, 105315, 136280, 88956, 175644, 121565, 217059, 168285, 247779, 185333, 237968, 4641, 23299, 138405, 272321, 87224, 142514, 90695, 150176, 124845, 216678, 299506, 211529, 4635, 213657, 65424, 131629, 20418, 230397, 82933, 285097, 186596, 218834, 262197, 109567, 249712, 159931, 228616, 111108, 246682, 52478, 57957, 77799, 186600, 70789, 184529, 204423, 217347, 113794, 274530, 109148, 86755, 291649, 59476, 105307, 64810, 207949, 70335, 59877, 228282, 150253, 130291, 112660, 53281, 171966, 186932, 59417, 157583, 83485, 185219, 33323, 50480, 157148, 110532, 154150, 288440, 186347, 224698, 77624, 227482, 214719, 66166, 95340, 60063, 248970, 133719, 207652, 31596, 285623, 209248, 164301, 40212, 144978, 24009, 272494, 253731, 13797, 236337, 93758, 98806, 135870, 244261, 240947, 140480, 296523, 231270, 55139, 210617, 286252, 251160, 104473, 269914, 40178, 160338, 169217, 51209, 159755, 27301, 164035, 202364, 135088, 231042, 116528, 59344, 125474, 181234, 92116, 28161, 172540, 212861, 101411, 24795, 93445, 7901, 40312, 266139, 118767, 40834, 3142, 166640, 244874, 230754, 269489, 296822, 292201, 126347, 10634, 201863, 232392, 272474, 57609, 54609, 183802, 250954, 23888, 157861, 177705, 214531, 70321, 176092, 249452, 55092, 68756, 270535, 149866, 106861, 51350, 269887, 105070, 83159, 120789, 250386, 69339, 218537, 179332, 221361, 270419, 8418, 280065, 36882, 117107, 292747, 145218, 108904, 171299, 119896, 298225, 204699, 121976, 209283, 41518, 263710, 225568, 261042, 99435, 56127, 84079, 279377, 140428, 214007, 146826, 262048, 279419, 297456, 223862, 68097, 286644, 27381, 54550, 46607, 140179, 88747, 201891, 30434, 128226, 212330, 220723, 180346, 296818, 86749, 173691, 195657, 161674, 82835, 293196, 184195, 241395, 72943, 51262, 295953, 170439, 139628, 203068, 54943, 267396, 39290, 66706, 140989, 266486, 201374, 174152, 99448, 67779, 68027, 18605, 272853, 295708, 191181, 218387, 73742, 29844, 21149, 283123, 142684, 235872, 107439, 55957, 208758, 170697, 170444, 278989, 128178, 117241, 223899, 212834, 90869, 15371, 224918, 107179, 242051, 131299, 176454, 180188, 196393, 276231, 39202, 202778, 268749, 209173, 275214, 91992, 170261, 103772, 142105, 164435, 289253, 4554, 238056, 249955, 13549, 99610, 193419, 220973, 110199, 17858, 149100, 228404, 133768, 193866, 172504, 136070, 170865, 218487, 18102, 265418, 54028, 46223, 65269, 117192, 271015, 43732, 208927, 72260, 57472, 139983, 47535, 142098, 233152, 158219, 156764, 296628, 259867, 15812, 227223, 148096, 184082, 285707, 175790, 117974, 125510, 231407, 225929, 259460, 148379, 12452, 100993, 272527, 35186, 137566, 40652, 204943, 212306, 262011, 177405, 81923, 218707, 251966, 133026, 108271, 24697, 299195, 167025, 209933, 237416, 83348, 188919, 48162, 63841, 130230, 113140, 12014, 126847, 227095, 167883, 213519, 90553, 273911, 91002, 81837, 62325, 193369, 175586, 30192, 42094, 111399, 130873, 181116, 274534, 210079, 135332, 142538, 22333, 209918, 151836, 8422, 147236, 38228, 133982, 198759, 242971, 96437, 123963, 222716, 28371, 251243, 14006, 43665, 280981, 19067, 247704, 161839, 103530, 82622, 261433, 264603, 77623, 142509, 50716, 34298, 76983, 16377, 293188, 274216, 169852, 245588, 168089, 47123, 46734, 43665, 193138, 222658, 119512, 234976, 23331, 155950, 183042, 101852, 266050, 182257, 19886, 128818, 247127, 43646, 782, 90487, 216474, 269093, 86035, 169670, 250042, 271904, 231929, 88572, 249342, 105928, 72211, 134552, 195038, 58973, 269360, 56593, 151720, 184903, 272442, 224599, 272327, 5657, 163259, 118890, 124569, 181669, 143508, 225400, 26385, 30979, 87135, 87033, 175041, 62019, 152548, 14244, 64621, 241937, 251174, 275872, 162503, 31867, 131883, 56281, 220580, 149602, 89349, 282523, 182188, 101007, 253662, 209049, 95977, 230437, 108382, 170769, 146442, 79761, 223687, 295653, 160832, 179661, 192962, 161793, 85291, 40010, 263394, 26760, 28814, 272363, 164907, 178172, 147834, 77194, 162434, 120583, 46237, 138420, 58688, 106685, 117945, 191328, 285934, 277033, 38591, 131219, 215862, 173865, 264971, 5986, 110651, 86616, 244510, 15598, 134368, 237964, 205548, 190833, 58045, 201511, 244387, 96306, 43579, 280347, 297190, 10155, 285687, 124706, 273017, 54085, 35796, 65766, 250597, 192827, 235450, 59065, 147448, 184323, 65348, 111190, 267785, 200355, 67548, 29115, 141665, 7646, 47767, 181962, 12770, 44821, 1008, 138547, 52976, 84360, 159903, 280401, 42734, 58007, 220363, 205722, 102482, 41437, 52758, 111405, 119752, 184427, 46874, 42254, 128973, 109681, 32100, 182891, 115614, 97456, 225430, 99241, 176100, 147085, 116409, 85626, 182066, 125830, 227070, 42042, 139036, 173841, 104576, 16728, 297659, 137785, 189368, 233663, 5538, 92347, 150000, 181773, 44039, 245278, 261211, 152592, 44811, 132237, 49767, 222695, 69070, 173146, 142780, 41955, 191395, 210404, 290183, 8562, 172350, 234195, 258609, 146913, 196146, 244481, 169378, 224385, 193138, 149219, 128111, 12607, 251089, 236471, 66874, 109072, 175010, 198604, 248051, 158612, 189445, 250428, 225950, 169923, 195311, 75579, 282830, 245469, 4883, 44877, 95906, 77577, 255922, 193139, 181187, 60120, 279168, 188165, 252834, 165188, 242748, 2321, 131471, 120852, 254712, 27430, 265988, 214831, 13085, 125938, 293196, 232600, 170377, 35288, 199193, 185330, 202646, 29431, 3856, 169368, 132964, 265439, 242042, 204505, 15689, 50935, 229315, 13752, 19339, 206656, 166732, 199176, 277016, 174063, 150075, 126544, 75153, 238447, 27100, 50740, 234487, 65040, 159800, 28762, 210305, 33987, 8885, 157993, 210485, 144775, 138802, 157708, 63443, 225395, 89015, 279512, 179898, 51272, 37938, 143799, 42932, 89450, 24671, 263725];

            // 输出生成的随机数字
            console.log(pairPoints);

            let dis_list = [];

            // 获取矩阵
            const { dataScaleMatrix, normalizeMatrix } = this.webGLMatrices;

            
            // 定义一个函数来应用矩阵变换
            function applyMatrix(matrix, point) {
                const x = point.x;
                const y = point.y;
                const w = 1; // 齐次坐标

                return {
                    x: matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * w,
                    y: matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * w,
                    w: matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * w
                };
            }

            for (const pair of pairPoints) {
                // 获取原始坐标
                const startNode = {x:this.promptPoints[pair].x, y: this.promptPoints[pair].y};
                const endNode = {x:this.promptPoints[pair + 300000].x, y: this.promptPoints[pair + 300000].y};
                // 转换为像素坐标
                // 先应用数据缩放矩阵
                // const stagePoint = applyMatrix(dataScaleMatrix, startNode);
                // const pixelPoint = applyMatrix(normalizeMatrix, stagePoint);

                // const stagePoint_end = applyMatrix(dataScaleMatrix, endNode);
                // const pixelPoint_end = applyMatrix(normalizeMatrix, stagePoint_end);

                const x0 = this.xScale(startNode.x);
                const y0 = this.yScale(startNode.y);

                const x1 = this.xScale(endNode.x);
                const y1 = this.yScale(endNode.y);


                console.log("endNode", endNode);

                const dis = Math.sqrt(Math.pow(x0 - x1, 2) + Math.pow(y0 - y1, 2));

                dis_list.push(dis);

            }

            // 对 dis_list 求平均并进行输出
            // 对 dis_list 求平均并进行输出
            const averageDis = dis_list.reduce((sum, value) => sum + value, 0) / dis_list.length;

            console.log("dis_list", dis_list);
            console.log("Average distance:", averageDis);

        }

    },
    computed: {
        ...mapState({
            iconShow: "iconShow",
            dataNodeLink: "dataNodeLink",
            selectedNode: "selectedNode",
            tableFiterResults: "tableFiterResults"
        }),
    },
    watch: {
        iconShow: {
            handler(newVal, oldVal) {
                this.showGrid = newVal.grid;
                this.topicCanvases.forEach(c => {
                    c.classed('hidden', !this.showGrid);
                });

                this.showTrace = newVal.trace;
                this.searchPointCanvas.classed('hidden', !this.showTrace);
                this.pointCanvas.classed('faded', this.showTrace);

                console.log("show", newVal, oldVal)

                if (newVal.points !== this.showPoints_back) {
                    // 使用 map 取反所有值
                    this.showPoints = this.showPoints.map(point => !point);
                    this.pointCanvas
                        .classed('hidden', !newVal.points)
                        .classed('faded', newVal.points);
                    this.searchPointCanvas.classed('hidden', newVal.points);
                    this.showPoints_back = !this.showPoints_back;

                }
            },
            deep: true,
        },
        dataNodeLink(newVal, oldVal) {
            if (newVal != oldVal) {
                this.getSearchTraceData();
            }
        },
        selectedNode(newVal, oldVal) {
            if (newVal !== oldVal & newVal !== '-1') {
                console.log("对这个进行输出", typeof newVal)
                this.getSearchByIdResult(newVal);

            }


        },
        tableFiterResults(newVal) {

            if (newVal.length > 0) {

                const resultList = []

                for (const resultIndex of newVal) {
                    const curPoint = this.promptPoints[resultIndex];
                    resultList.push(curPoint);
                }
                this.searchPointResults2 = resultList;
                this.searchPointCanvas.classed('hidden', false);
                this.pointCanvas.classed('faded', true);

                PointDrawer.drawSearchScatterPlot2(this);


            }
        }
    }
};


</script>

<style lang="scss">
@use './DistributionView.scss';
</style>