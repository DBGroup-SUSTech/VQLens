<template>
  <div v-if="this.$store.state.isDone['DisT']" class="distribution-main">

    <svg ref="scatterSvg" class="scatter-plot" @click="handleClick" @mousemove="handleMouseMove"
      @mouseover="handleMouseOver" @mouseout="handleMouseOut" @mousedown="handleMouseDown" @mouseup="handleMouseUp"
      @wheel="handleZoom">
    </svg>


    <canvas ref="webglDiv" class="webgl-div"></canvas>

  </div>
</template>


<script>
import * as d3 from 'd3';
import api from "@/api/data";
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';


import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { mapState } from "vuex";
import { config } from '@/config/config';

export default {
  name: "Distribution",
  components: {

  },
  data() {
    return {
      reductionData: [],

      margin: { top: 10, right: 30, bottom: 40, left: 50 },
      width: 0,
      height: 0,
      scaleFactor: 50,
      labels: 0,
      linkData: [],

      // 在这里定义的 camera 的对象
      camera: null,
      renderer: null,
      scene: null,
      controls: null,
      centerObject: null, // 用于平移的中心对象
      scaledData: null,
      points: null,
      raycaster: null,
      pointMap: null,
      xAxis: null,
      yAxis: null,

      // 右键
      isLeftMouseDown: "",
      isRightMouseDown: "",
      lastMouseX: "",
      lastMouseY: "",

      svg: null,

      groupColorMap: this.generateMaxDistinctColors(50),
    };
  },
  mounted() {

    this.getViewSize();
    this.reductionData = this.$store.state.reductionInfo;
    this.gridDensity = this.$store.state.gridDensity;
    this.linkData = this.$store.state.dataNodeLink["links"];

    if (this.reductionData && this.reductionData.length) {
      if (this.reductionSet["dimension"] == "2D") {
        this.initScatter2DPlot(this.reductionData, this.linkData);
      }
      else {
        this.initScatter3DPlot(this.reductionData, this.linkData);
      }
    }
  },
  methods: {
    getViewSize() {
      const dag = this.$refs.webglDiv;
      this.height = dag.clientHeight;
      this.width = dag.clientWidth;
    },
    generateMaxDistinctColors(count) {
      const colors = {};
      const step = 360 / count;  // 色相值步进，确保每个色相差别更大
      for (let i = 0; i < count; i++) {
        const hue = i * step;  // 大色相步长
        const saturation = i % 2 === 0 ? 90 : 100;  // 交替饱和度，保持鲜艳
        const lightness = i % 3 === 0 ? 35 : 65;  // 更大的亮度差异
        const color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;  // 使用 HSL 模型
        colors[i] = color;
      }
      return colors;
    },
    updatePosition() {

      // 这个函数主要是用于同步svg和下层three.js中的元素
      const svgElement = d3.select(this.$refs.scatterSvg)

      // 偏移的距离
      const offX = this.centerObject.position.x;
      const offY = this.centerObject.position.y

      // 用于同步 images
      if (this.$store.state.imageNodeList.length > 0) {
        this.$store.state.imageNodeList.forEach(nodeId => {
          const imageElement = svgElement.select(`image[data-node-id="${nodeId}"]`).node();
          const point = this.scaledData.find(p => p.id == nodeId);

          if (point && imageElement) {
            const worldPos = new THREE.Vector3(
              point.x + offX,
              point.y + offY,
              0
            );
            const screenCoords = this.worldToScreenPoint(worldPos)

            imageElement.setAttribute('x', screenCoords.x);
            imageElement.setAttribute('y', screenCoords.y);
          }
        });
      }

      // 更新节点位置,此时的节点主要是 比较特殊的一些节点
      svgElement.selectAll("circle.special-node-class")
        .attr("cx", d => {
          const worldPos = new THREE.Vector3(d.x + offX, d.y + offY, 0);
          return this.worldToScreenPoint(worldPos).x;
        })
        .attr("cy", d => {
          const worldPos = new THREE.Vector3(d.x + offX, d.y + offY, 0);
          return this.worldToScreenPoint(worldPos).y;
        });

      // 更新节点位置,此时的节点主要是 trace 中的节点
      svgElement.selectAll("circle.source-node-class")
        .attr("cx", d => {
          const worldPos = new THREE.Vector3(this.pointMap[d.source].x + offX, this.pointMap[d.source].y + offY, 0);
          return this.worldToScreenPoint(worldPos).x;
        })
        .attr("cy", d => {
          const worldPos = new THREE.Vector3(this.pointMap[d.source].x + offX, this.pointMap[d.source].y + offY, 0);
          return this.worldToScreenPoint(worldPos).y;
        });

      svgElement.selectAll("circle.target-node-class")
        .attr("cx", d => {
          const worldPos = new THREE.Vector3(this.pointMap[d.target].x + offX, this.pointMap[d.target].y + offY, 0);
          return this.worldToScreenPoint(worldPos).x;
        })
        .attr("cy", d => {
          const worldPos = new THREE.Vector3(this.pointMap[d.target].x + offX, this.pointMap[d.target].y + offY, 0);
          return this.worldToScreenPoint(worldPos).y;
        });

      // 更新连接线位置
      svgElement.selectAll("line.connection-class")
        .attr("x1", d => {
          const sourcePos = new THREE.Vector3(this.pointMap[d.source].x + offX, this.pointMap[d.source].y + offY, 0);
          return this.worldToScreenPoint(sourcePos).x;
        })
        .attr("y1", d => {
          const sourcePos = new THREE.Vector3(this.pointMap[d.source].x + offX, this.pointMap[d.source].y + offY, 0);
          return this.worldToScreenPoint(sourcePos).y;
        })
        .attr("x2", d => {
          const targetPos = new THREE.Vector3(this.pointMap[d.target].x + offX, this.pointMap[d.target].y + offY, 0);
          return this.worldToScreenPoint(targetPos).x;
        })
        .attr("y2", d => {
          const targetPos = new THREE.Vector3(this.pointMap[d.target].x + offX, this.pointMap[d.target].y + offY, 0);
          return this.worldToScreenPoint(targetPos).y;
        });

      const posX = this.xAxis.geometry.attributes.position.array;

      svgElement.selectAll(".x-axis")
        .attr("x1", d => {
          const sourcePos = new THREE.Vector3(posX[0] + offX, posX[1] + offY, 0);
          return this.worldToScreenPoint(sourcePos).x;
        })
        .attr("y1", d => {
          const sourcePos = new THREE.Vector3(posX[0] + offX, posX[1] + offY, 0);
          return this.worldToScreenPoint(sourcePos).y;
        })
        .attr("x2", d => {
          const targetPos = new THREE.Vector3(posX[3] + offX, posX[4] + offY, 0);
          return this.worldToScreenPoint(targetPos).x;
        })
        .attr("y2", d => {
          const targetPos = new THREE.Vector3(posX[3] + offX, posX[4] + offY, 0);
          return this.worldToScreenPoint(targetPos).y;
        });

      const posY = this.yAxis.geometry.attributes.position.array;

      svgElement.selectAll(".y-axis")
        .attr("x1", d => {
          const sourcePos = new THREE.Vector3(posY[0] + offX, posY[1] + offY, 0);
          return this.worldToScreenPoint(sourcePos).x;
        })
        .attr("y1", d => {
          const sourcePos = new THREE.Vector3(posY[0] + offX, posY[1] + offY, 0);
          return this.worldToScreenPoint(sourcePos).y;
        })
        .attr("x2", d => {
          const targetPos = new THREE.Vector3(posY[3] + offX, posY[4] + offY, 0);
          return this.worldToScreenPoint(targetPos).x;
        })
        .attr("y2", d => {
          const targetPos = new THREE.Vector3(posY[3] + offX, posY[4] + offY, 0);
          return this.worldToScreenPoint(targetPos).y;
        });

      console.log("Position updated");
    },
    async addImageToSvg(x, y, nodeId) {

      const idx = this.$store.state.imageNodeList.findIndex(node => node === nodeId);
      const svgElement = this.$refs.scatterSvg;
      if (idx !== -1) {
        const imageElement = svgElement.querySelector(`image[data-node-id="${nodeId}"]`);

        if (imageElement) {
          svgElement.removeChild(imageElement);
        }

        this.$store.commit('setImageNode', {
          op: 'remove',
          nodeId: nodeId
        });

      } else {

        const res = await api.getImageUrl({ "datasetName": this.$store.state.datasetName, "nodeId": nodeId });
        const imageUrl = res["data"]["imageUrl"];
        const imageElement = document.createElementNS('http://www.w3.org/2000/svg', 'image');
        imageElement.setAttributeNS(null, 'x', x);
        imageElement.setAttributeNS(null, 'y', y);
        imageElement.setAttributeNS(null, 'width', 100);
        imageElement.setAttributeNS(null, 'height', 100);
        imageElement.setAttributeNS('http://www.w3.org/1999/xlink', 'href', imageUrl);
        imageElement.setAttribute('data-node-id', nodeId);
        svgElement.appendChild(imageElement);
        this.$store.commit('setImageNode', {
          op: 'add',
          nodeId: nodeId
        });

      }

    },
    updateClickRole(index) {

      const colorStartNode = new THREE.Color(this.groupColorMap[1]);
      const colorG = new THREE.Color(this.groupColorMap[2]);
      const colorS = new THREE.Color(this.groupColorMap[4]);

      const colors = this.points.geometry.attributes.color.array;

      // 根据状态设置颜色
      const point = this.scaledData[index];
      if (point.isClicked) {
        colors[index * 3] = 0;     // R
        colors[index * 3 + 1] = 0; // G
        colors[index * 3 + 2] = 0; // B
      } else {
        let color;
        if (point.type === "root") {
          color = colorStartNode; // 使用根节点颜色
        } else if (point.type === "search") {
          color = colorG; // 搜索点颜色
        } else if (point.type === "other") {
          color = colorS; // 其他类型颜色
        } else if (point.type === "normal") {
          color = new THREE.Color(this.groupColorMap[point.label]); // 通过 label 获取分组颜色
        }
        colors[index * 3] = color.r;     // R
        colors[index * 3 + 1] = color.g; // G
        colors[index * 3 + 2] = color.b; // B
      }

      // 标记几何数据更新
      this.points.geometry.attributes.color.needsUpdate = true;

    },
    handleClick(e) {
      // // 这个函数暂时存在问题
      // const svgElement = this.$refs.scatterSvg;
      // // 将鼠标坐标转换为相对于 SVG 的坐标
      // const svgPoint = svgElement.createSVGPoint();
      // svgPoint.x = e.clientX;
      // svgPoint.y = e.clientY;
      // const svgCoords = svgPoint.matrixTransform(svgElement.getScreenCTM().inverse());
      // // const vectorCoords = new THREE.Vector3(
      // //   (svgCoords.x / this.renderer.domElement.width) * 2 - 1,
      // //   -(svgCoords.y / this.renderer.domElement.height) * 2 + 1,
      // //   0.5
      // // );
      // const rect = this.renderer.domElement.getBoundingClientRect()
      // const mouse = new THREE.Vector2(634.5, 366)
      // mouse.x = ((e.clientX - rect.left) / this.renderer.domElement.clientWidth) * 2 - 1
      // mouse.y = -((e.clientY - rect.top) / this.renderer.domElement.clientHeight) * 2 + 1

      // this.raycaster.params.Line.threshold = 10000;
      // this.raycaster.setFromCamera(mouse, this.camera);

      // const intersects = this.raycaster.intersectObjects(this.points, true);
      // // console.log(`222 try`, intersects);
      // if (intersects.length > 0) {
      //   console.log(`222 success!`, intersects);
      //   intersects[0].object.geometry.attributes.color.array[intersects[0].index * 3] = 0
      //   intersects[0].object.geometry.attributes.color.array[intersects[0].index * 3 + 1] = 0
      //   intersects[0].object.geometry.attributes.color.array[intersects[0].index * 3 + 2] = 0

      //   intersects[0].object.geometry.attributes.color.needsUpdate = true;
      // }

    },
    handleMouseDown(e) {

      if (e.button === 1) {
        this.isLeftMouseDown = true;
      }
      else if (e.button === 2) {
        this.isRightMouseDown = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    },
    handleMouseUp(e) {

      if (e.button === 1) {
        this.isLeftMouseDown = false;
      }
      else if (e.button === 2) {
        this.isRightMouseDown = false;
      }
    },
    handleMouseMove(e) {

      if (this.isLeftMouseDown) {

        const svgElement = this.$refs.scatterSvg;
        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const svgPoint = svgElement.createSVGPoint();
        svgPoint.x = mouseX;
        svgPoint.y = mouseY;
        const svgCoords = svgPoint.matrixTransform(svgElement.getScreenCTM().inverse());

        const worldPos = this.screenToWorldPoint(svgCoords.x, svgCoords.y);
      }
      else if (this.isRightMouseDown) {

        const deltaX = e.clientX - this.lastMouseX;
        const deltaY = e.clientY - this.lastMouseY;

        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        const moveSpeed = 1;

        const moveX = deltaX * moveSpeed;
        const moveY = deltaY * -moveSpeed;

        this.centerObject.position.x += moveX;
        this.centerObject.position.y += moveY;

        this.renderer.render(this.scene, this.camera);
        this.updatePosition();
      }
    },
    handleMouseOver() {
      // console.log("MouseOver")
    },
    handleMouseOut() {
      // console.log("MouseOut")
    },
    handleZoom(event) {
      // event.preventDefault();

      const zoomFactor = 1.1;
      const delta = event.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

      // 缩放 Three.js 场景
      if (this.camera.isOrthographicCamera) {
        this.camera.zoom *= delta; // 正交相机调整缩放
      } else {
        this.camera.position.z /= delta; // 透视相机调整位置
      }
      this.camera.updateProjectionMatrix(); // 更新相机投影矩阵
      this.renderer.render(this.scene, this.camera); // 重新渲染场景
      this.updatePosition();
    },

    worldToScreenPoint(worldPosition) {
      const screenPosition = worldPosition.clone();
      screenPosition.project(this.camera);
      const widthHalf = this.renderer.domElement.width / 2;
      const heightHalf = this.renderer.domElement.height / 2;
      return {
        x: (screenPosition.x * widthHalf) + widthHalf,
        y: -(screenPosition.y * heightHalf) + heightHalf
      };
    },

    screenToWorldPoint(screenX, screenY) {
      // 这里的 screen 函数其实是相较于整个页面而言的
      const vector = new THREE.Vector3(
        (screenX / this.renderer.domElement.width) * 2 - 1,
        -(screenY / this.renderer.domElement.height) * 2 + 1,
        0.5
      );
      let vectors = vector.unproject(this.camera);
      return vectors;
    },
    drawConnectionsOnSvg(connections, pointMap) {
      const svg = d3.select(this.$refs.scatterSvg);
      const connectData = this.$store.state.dataNodeLink["links"];
      const links = svg.selectAll("line")
        .data(connections)
        .enter()
        .append("line")
        .attr("class", "connection-class") // 设置类名
        .attr("x1", d => this.worldToScreenPoint(new THREE.Vector3(pointMap[d.source].x, pointMap[d.source].y, 0)).x)
        .attr("y1", d => this.worldToScreenPoint(new THREE.Vector3(pointMap[d.source].x, pointMap[d.source].y, 0)).y)
        .attr("x2", d => this.worldToScreenPoint(new THREE.Vector3(pointMap[d.target].x, pointMap[d.target].y, 0)).x)
        .attr("y2", d => this.worldToScreenPoint(new THREE.Vector3(pointMap[d.target].x, pointMap[d.target].y, 0)).y)
        .attr("stroke", "#A9A9A9")
        .attr("stroke-width", 1);

      svg.selectAll("circle.source-node-class").remove();
      svg.selectAll("circle.target-node-class").remove();
      svg.selectAll(".y-axis").remove();

      // 绘制节点（source 和 target 节点）
      svg.selectAll("circle.source-node-class")
        .data(connections)
        .enter()
        .append("circle")
        .attr("class", "source-node-class") // 设置类名
        .attr("cx", d => this.worldToScreenPoint(new THREE.Vector3(pointMap[d.source].x, pointMap[d.source].y, 0)).x)
        .attr("cy", d => this.worldToScreenPoint(new THREE.Vector3(pointMap[d.source].x, pointMap[d.source].y, 0)).y)
        .attr("r", 2) // 设置节点的半径
        .attr("fill", "#00BFFF"); // 设置节点颜色

      // 如果也要绘制 target 节点
      svg.selectAll("circle.target-node-class")
        .data(connections)
        .enter()
        .append("circle")
        .attr("class", "target-node-class")
        .attr("cx", d => this.worldToScreenPoint(new THREE.Vector3(pointMap[d.target].x, pointMap[d.target].y, 0)).x)
        .attr("cy", d => this.worldToScreenPoint(new THREE.Vector3(pointMap[d.target].x, pointMap[d.target].y, 0)).y)
        .attr("r", 2)
        .attr("fill", "#00BFFF"); // 设置target节点颜色
    },
    drawNodesOnSVG() {
      const svg = d3.select(this.$refs.scatterSvg);

      const points = svg.selectAll("circle.special-node-class")
        .data(this.scaledData)
        .enter()
        .append("circle")
        .attr("class", "special-node-class")
        .attr("cx", d => this.worldToScreenPoint(new THREE.Vector3(d.x, d.y, 0)).x)
        .attr("cy", d => this.worldToScreenPoint(new THREE.Vector3(d.x, d.y, 0)).y)
        .attr("r", d => {
          if (d.type === "root") {
            return 4;
          } else if (d.type === "search" || d.type === "other" || d.type === "gt") {
            return 3;
          }

        })
        .attr("fill", d => {
          console.log(d.type);  // 打印以检查 d.type 是否有期望的值

          if (String(d.type) === "root") {
            return "red";
          } else if (String(d.type) == "search") {
            return "green";
          } else if (String(d.type) == "other") {
            return "#FF8C00";
          } else if (String(d.type) == "gt") {
            return "yellow";
          }
        });

      // 使用 svg.raise() 确保 root, search, other 类型的节点在上方
      points.each(function (d) {
        if (d.type === "root" || d.type === "search" || d.type === "other" || d.type === "gt") {
          d3.select(this).raise();  // 提升优先级
        }
      });

    },
    drawSVGAxis() {
      const svg = d3.select(this.$refs.scatterSvg);

      // 清除旧的 X 轴和 Y 轴
      svg.selectAll(".x-axis").remove();
      svg.selectAll(".y-axis").remove();

      // 获取中心位置
      const centerX = this.centerObject.position.x;
      const centerY = this.centerObject.position.y;

      const posX = this.xAxis.geometry.attributes.position.array;

      let startPoint = this.worldToScreenPoint(new THREE.Vector3(posX[0], posX[1], posX[2])); // 假设线的起点
      let endPoint = this.worldToScreenPoint(new THREE.Vector3(posX[3], posX[4], posX[5])); // 假设线的终点

      svg.append("line")
        .attr("class", "x-axis")
        .attr("x1", startPoint.x)
        .attr("y1", startPoint.y)
        .attr("x2", endPoint.x)
        .attr("y2", endPoint.y)
        .attr("stroke", "red")
        .attr("stroke-width", 2);

      // 假设 worldToScreenPoint 已经定义并可以正确转换坐标
      const posY = this.yAxis.geometry.attributes.position.array;
      startPoint = this.worldToScreenPoint(new THREE.Vector3(posY[0], posY[1], posY[2])); // 假设线的起点
      endPoint = this.worldToScreenPoint(new THREE.Vector3(posY[3], posY[4], posY[5])); // 假设线的终点

      svg.append("line")
        .attr("class", "y-axis")
        .attr("x1", startPoint.x)
        .attr("y1", startPoint.y)
        .attr("x2", endPoint.x)
        .attr("y2", endPoint.y)
        .attr("stroke", "blue")
        .attr("stroke-width", 2);

    },
    drawContour() {
      if (!this.gridDensity == null) {
        console.error('Grid data not initialized');
        return null;
      }

      const contourGroup = this.svg
        .select('.contour-group');

      const gridData1D = [];
      for (const row of this.gridDensity.grid) {
        for (const item of row) {
          gridData1D.push(item);
        }
      }

      // Linear interpolate the levels to determine the thresholds
      const levels = config.layout.contourLevels;
      const minValue = Math.min(...gridData1D);
      const maxValue = Math.max(...gridData1D);
      const step = (maxValue - minValue) / levels;

      const thresholds = Array.from({ length: levels }, (_, i) => minValue + step * i);

      let contours = d3
        .contours()
        .thresholds(thresholds)
        .size([this.gridDensity.grid.length, this.gridDensity.grid[0].length])(
          gridData1D
        );

      // Convert the scale of the generated paths
      const contourXScale = d3
        .scaleLinear()
        .domain([0, this.gridDensity.grid.length])
        .range(this.gridDensity.xRange);

      const contourYScale = d3
        .scaleLinear()
        .domain([0, this.gridDensity.grid[0].length])
        .range(this.gridDensity.yRange);


            // 获取当前视图的宽度和高度
      const width = this.gridDensity.xRange[1] - this.gridDensity.xRange[0];
      const height = this.gridDensity.yRange[1] - this.gridDensity.yRange[0];

      // 计算中心位置
      const centerX = width / 2;
      const centerY = height / 2;

      contours = contours.map(item => {
        item.coordinates = item.coordinates.map(coordinates => {
          return coordinates.map(positions => {
            return positions.map(point => {
              return [
                // 将坐标调整到中心位置
                contourXScale(point[0]) + 400,
                contourYScale(point[1]) + 400
              ];
            });
          });
        });
        return item;
      });

      const blueScale = d3.interpolateLab(
        '#ffffff',
        config.layout['groupColors'][0]
      );
      const colorScale = d3.scaleSequential()
        .domain(d3.extent(thresholds))
        .interpolator(d => blueScale(d / 1));

      // Draw the contours
      contourGroup
        .selectAll('path')
        .data(contours.slice(1))
        .join('path')
        .attr('fill', d => colorScale(d.value))
        .attr('d', d3.geoPath());

      // Zoom in to focus on the second level of the contour
      // The first level is at 0
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;

      if (contours.length > 1) {
        for (const coord of contours[1].coordinates) {
          for (const coordPoints of coord) {
            for (const point of coordPoints) {
              if (point[0] < x0) x0 = point[0];
              if (point[1] < y0) y0 = point[1];
              if (point[0] > x1) x1 = point[0];
              if (point[1] > y1) y1 = point[1];
            }
          }
        }
      }

      // const screenPadding = 20;
      // const viewAreaWidth =
      //   this.svgFullSize.width - config.layout.searchPanelWidth;
      // const viewAreaHeight =
      //   this.svgFullSize.height -
      //   config.layout.topBarHeight -
      //   config.layout.footerHeight;

      // const initZoomK = Math.min(
      //   viewAreaWidth / (x1 - x0 + screenPadding),
      //   viewAreaHeight / (y1 - y0 + screenPadding)
      // );

      // this.initZoomTransform = d3.zoomIdentity
      //   .translate(
      //     (this.svgFullSize.width + config.layout.searchPanelWidth) / 2,
      //     (this.svgFullSize.height + config.layout.topBarHeight) / 2
      //   )
      //   .scale(initZoomK)
      //   .translate(-(x0 + (x1 - x0) / 2), -(y0 + (y1 - y0) / 2));

      // // Trigger the first zoom
      // this.topSvg
      //   .call(selection =>
      //     this.zoom?.transform(selection, this.initZoomTransform)
      //   )
      //   .on('end', () => {
      //     this.contoursInitialized = true;
      //   });

      // // Double click to reset zoom to the initial viewpoint
      // this.topSvg.on('dblclick', () => {
      //   this.topSvg
      //     .transition()
      //     .duration(700)
      //     .call(selection => {
      //       this.zoom?.transform(selection, this.initZoomTransform);
      //     });
      // });

      return contours;
    },
    initScatter2DPlot(data, connections) {
      const { width, height } = this;
      const scaleFactor = 1;

      // 创建场景
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0xffffff);

      // 创建中心对象
      this.centerObject = new THREE.Object3D();
      this.scene.add(this.centerObject);

      // 创建相机（2D 视图使用正交相机）
      this.camera = new THREE.OrthographicCamera(
        width / -2, width / 2, height / 2, height / -2, 1, 1000
      );
      this.camera.position.z = 10;

      // 创建渲染器
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      this.renderer.setSize(width, height);

      // 确认选择了正确的 div 元素
      const scatterPlotDiv = this.$refs['webglDiv'];
      if (!scatterPlotDiv) {
        console.error("ScatterPlot div not found");
        return;
      }
      scatterPlotDiv.appendChild(this.renderer.domElement);

      // 数据缩放和居中处理
      const xExtent = d3.extent(data, d => d.x);
      const yExtent = d3.extent(data, d => d.y);

      const xCenter = (xExtent[0] + xExtent[1]) / 2;
      const yCenter = (yExtent[0] + yExtent[1]) / 2;

      this.scaledData = data.map(point => ({
        type: "normal",
        id: point.id,
        x: (point.x - xCenter) * scaleFactor,
        y: (point.y - yCenter) * scaleFactor,
        label: point.label,
        isClicked: false
      }));

      // 创建一个 id 到点的映射
      this.pointMap = {};
      this.scaledData.forEach(point => {
        this.pointMap[point.id] = point;
      });


      // 创建点的几何体
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(this.scaledData.length * 3);
      const colors = new Float32Array(this.scaledData.length * 3);
      const sizes = new Float32Array(this.scaledData.length);

      this.scaledData.forEach((point, i) => {
        positions[i * 3] = point.x;
        positions[i * 3 + 1] = point.y;
        positions[i * 3 + 2] = 0; // Z 轴为 0，确保点在 2D 平面上

        // 根据标签设置颜色
        const color = new THREE.Color("#EAEAEF");
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        sizes[i] = 0.10;
      });

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      // 定义顶点着色器和片段着色器
      const vertexShader = `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z); // 调整大小与视角距离有关
          gl_Position = projectionMatrix * mvPosition;
        }
      `;

      const fragmentShader = `
        varying vec3 vColor;
        void main() {
          // 计算点到中心的距离
          float dist = length(gl_PointCoord - vec2(0.5, 0.5));
          // 如果距离超过0.5,表示在点的外部，舍弃该片段
          if (dist > 0.5) {
            discard;
          }
          gl_FragColor = vec4(vColor, 1.0);
        }
      `;

      const material = new THREE.ShaderMaterial({
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {}
      });

      this.points = new THREE.Points(geometry, material);
      this.points.renderOrder = 2; // 确保点的渲染顺序在轴线之前
      this.scene.add(this.points);
      this.centerObject.add(this.points);

      //创建射线
      this.raycaster = new THREE.Raycaster()
      // //用一个二维向量保存鼠标点击画布上
      const mouse = new THREE.Vector2(634.5, 366)
      const colorStartNode = new THREE.Color(this.groupColorMap[1]);
      const colorG = new THREE.Color(this.groupColorMap[2]);
      const colorS = new THREE.Color(this.groupColorMap[4]);

      if (connections && connections.length > 0) {
        const connectData = this.$store.state.dataNodeLink["links"];
        const startNode = this.$store.state.dataNodeLink["startNode"];
        const sList = this.$store.state.dataNodeLink["sList"];
        const gList = this.$store.state.dataNodeLink["gList"];

        const diff_list_s = sList.filter(item => !gList.includes(item));
        const diff_list_g = gList.filter(item => !sList.includes(item));
        const inter_list = sList.filter(item => gList.includes(item));

        console.log("Connections: ", startNode);


        if (startNode !== undefined && this.pointMap[startNode]) {
          const startNodeIndex = this.scaledData.findIndex(p => p.id === startNode);
          this.scaledData[startNodeIndex].type = "root";
          console.log("是否画出来", startNodeIndex)
        }

        // 改变 gList 中节点的颜色和大小
        inter_list.forEach(nodeId => {
          if (this.pointMap[nodeId]) {
            const nodeIndex = this.scaledData.findIndex(p => p.id === nodeId);
            this.scaledData[nodeIndex].type = "search";
          }
        });

        // 改变 sList 中节点的颜色和大小
        diff_list_s.forEach(nodeId => {
          if (this.pointMap[nodeId]) {
            const nodeIndex = this.scaledData.findIndex(p => p.id === nodeId);
            this.scaledData[nodeIndex].type = "other";
          }
        });

        diff_list_g.forEach(nodeId => {
          if (this.pointMap[nodeId]) {
            const nodeIndex = this.scaledData.findIndex(p => p.id === nodeId);
            this.scaledData[nodeIndex].type = "gt";
          }
        });
        console.log("Connections: ", startNode);

        // 开始调用绘制线条的功能
        this.drawConnectionsOnSvg(connections, this.pointMap);
        this.drawNodesOnSVG();


      }
      window.addEventListener("click", (e) => {

        const rect = this.renderer.domElement.getBoundingClientRect()

        mouse.x = ((e.clientX - rect.left) / this.renderer.domElement.clientWidth) * 2 - 1
        mouse.y = -((e.clientY - rect.top) / this.renderer.domElement.clientHeight) * 2 + 1

        this.raycaster.params.Line.threshold = 10000
        this.raycaster.setFromCamera(mouse, this.camera)

        const intersects = this.raycaster.intersectObject(this.points, true)

        if (intersects.length > 0) {

          const index = intersects[0].index;
          const point = this.scaledData[index];

          // 切换 isClicked 状态
          point.isClicked = !point.isClicked;
          // 想要跟右边的一起联动起来
          this.$store.commit('setSelectedNode', point.id);

          this.updateClickRole(index);

          this.addImageToSvg(e.clientX - rect.left, e.clientY - rect.top, index);

        }
      })


      // 提取网格数据和范围
      const grid_density = this.gridDensity.grid;
      const xRange = this.gridDensity.xRange;
      const yRange = this.gridDensity.yRange;

      // 网格大小
      const grid_size = grid_density.length;  // 假设网格是正方形

      // 生成网格的 X 和 Y 坐标范围
      const grid_xs = d3.range(
        (xRange[0] - xCenter) * scaleFactor,
        (xRange[1] - xCenter) * scaleFactor,
        ((xRange[1] - xRange[0]) / grid_size) * scaleFactor
      );

      const grid_ys = d3.range(
        (yRange[0] - yCenter) * scaleFactor,
        (yRange[1] - yCenter) * scaleFactor,
        ((yRange[1] - yRange[0]) / grid_size) * scaleFactor
      );

      this.svg = d3.select(this.$refs.scatterSvg);
      const umapGroup = this.svg
        .append('g')
        .attr('class', 'umap-group')

      console.log("this.$refs.scatterSvg", umapGroup)

      umapGroup
        .append('g')
        .attr('class', 'contour-group')

      this.drawContour();

      // 4. 设置 d3.zoom() 来支持缩放和平移
      const zoom = d3.zoom()
        .scaleExtent([0.5, 100]) // 设置缩放范围，最小0.5倍，最大5倍
        .on("zoom", (event) => {
          // 通过 event.transform 获取缩放和平移的变换信息
          umapGroup.attr("transform", event.transform);
        });

      // 将缩放行为应用到 SVG 元素
      this.svg.call(zoom);


      // 创建坐标轴线的函数
      function createAxisLine(start, end, color) {
        const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
        const material = new THREE.LineBasicMaterial({
          color,
          depthTest: false,
          depthWrite: false
        });
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 10;
        return line;
      }

      // 创建更长的坐标轴线
      const length = 300; // 坐标轴的长度

      this.xAxis = createAxisLine(
        new THREE.Vector3(-length, 0, 0),
        new THREE.Vector3(length, 0, 0),
        0xff0000 // 红色
      );

      this.yAxis = createAxisLine(
        new THREE.Vector3(0, -length, 0),
        new THREE.Vector3(0, length, 0),
        0x00ff00 // 绿色
      );

      this.drawSVGAxis();
      // 将坐标轴线添加到场景中
      this.scene.add(this.xAxis);
      this.scene.add(this.yAxis);
      this.centerObject.add(this.xAxis);
      this.centerObject.add(this.yAxis);

      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableRotate = false; // 禁用旋转
      this.controls.enableZoom = true; // 启用缩放
      this.controls.enablePan = true; // 启用平移

      // 动画循环
      const animate = () => {
        requestAnimationFrame(animate);
        this.controls.update(); // 确保平移和缩放的更新
        this.renderer.render(this.scene, this.camera);
      };

      animate();
    },

  },
  computed: {
    ...mapState({
      retrievalSet: "retrievalSet",
      reductionSet: "reductionSet",
      datasetName: "datasetName",
      modelName: "modelName",
      reductionInfo: "reductionInfo",
      isDone: "isDone",
      selectedId: "selectedId"
    }),
  },
  watch: {
    reductionInfo(newVal) {
      if (newVal && newVal.length) {
        this.reductionData = newVal;
        this.gridDensity = this.$store.state.gridDensity;
        this.initScatterPlot(this.reductionData);
      }
    },
    selectedId(newVal) {

      const index = Number(newVal) - 1;
      const rect = this.renderer.domElement.getBoundingClientRect()

      const selectedPoint = this.pointMap[index];
      selectedPoint["isClicked"] = !selectedPoint["isClicked"];
      console.log("取消显示", this.points)

      this.updateClickRole(index);
      // 获取该点在 geometry 中的局部坐标
      const positions = this.points.geometry.attributes.position.array;  // 获取 position 数组
      const x = positions[index * 3];      // 获取 x 坐标
      const y = positions[index * 3 + 1];  // 获取 y 坐标
      const z = positions[index * 3 + 2];  // 获取 z 坐标

      const position = new THREE.Vector3(x, y, z);  // 将局部坐标放入 Vector3

      // 获取该点在场景中的世界坐标
      const worldPosition = new THREE.Vector3();
      this.points.getWorldPosition(worldPosition);

      // 计算该点的世界坐标
      const finalWorldPosition = worldPosition.clone().add(position);

      // 将世界坐标转换为屏幕坐标
      const screenPosition = this.worldToScreenPoint(finalWorldPosition);

      this.addImageToSvg(screenPosition.x, screenPosition.y - rect.top, index);
      this.renderer.render(this.scene, this.camera);
    }
  }
};
</script>

<style scoped lang="scss">
.distribution-main {
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.scatter-plot {
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;

}

.webgl-div {
  height: 100%;
  width: 100%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}
</style>