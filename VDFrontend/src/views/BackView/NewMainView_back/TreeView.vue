<template>
  <div v-if="this.$store.state.fileName" class="tree-main" ref="treeMain">
    <svg ref="tree" class="tree-svg"></svg>
    <svg ref="thumbnailTree" class="thumbnail-tree-svg"></svg>
  </div>
</template>

<script>

import * as d3 from "d3";
import {mapState} from "vuex";
import api from "@/api/data";

export default {
  name: "TreeView",
  components: {},
  data() {
    return {
      treeData: {},
      svgWidth: 0,
      svgHeight: 0,
      velocityDecay: 0.6,
      thumbnailTreeWidth: 0, // 缩略图宽度
      thumbnailTreeHeight: 0, // 缩略图高度

    };
  },
  mounted() {

  },
  methods: {
    getViewSize() {
      const tree = this.$refs.treeMain; // 之后修改
      this.svgWidth = tree.clientWidth;
      this.svgHeight = tree.clientHeight;

      this.thumbnailTreeWidth = this.svgWidth / 5;// 缩略图宽度
      this.thumbnailTreeHeight = this.svgHeight / 5;
    },
    async convertToImage(event, node) {
      const res = await api.getImageUrl({fileName: this.$store.state.fileName, nodeId: +node.data.name});
      const imageUrl = res.data.image_url;
      const patternId = `pattern-${+node.data.name}`;
      const targetElement = d3.select(event.target);

      const targetBBox = targetElement.node().getBBox();
      const targetWidth = targetBBox.width;
      const targetHeight = targetBBox.height;

      let pattern = d3.select(`#${patternId}`);
      if (pattern.empty()) {
        // 如果 pattern 不存在，则创建
        const svg = d3.select(this.$refs.tree);

        // 确保 defs 存在
        let defs = svg.select("defs");
        if (defs.empty()) {
          defs = svg.append("defs");
        }

        const pattern = defs.append("pattern")
            .attr("id", patternId)
            .attr("patternUnits", "objectBoundingBox")
            .attr("width", 1) // 宽度为 1 表示相对于目标元素的宽度
            .attr("height", 1) // 高度为 1 表示相对于目标元素的高度
            .attr("patternTransform", "translate(1, 1)"); // 向右和向下移动 10 个单位

        const image = pattern.append("image")
            .attr("xlink:href", imageUrl)
            .attr("width", 58)
            .attr("height", 58)
            .attr("preserveAspectRatio", "xMidYMid slice");
      }

      // 填充目标元素
      targetElement
          .attr("r", 30)
          .attr("fill", `url(#${patternId})`)
          .attr("stroke", "#000") // 设置边框颜色
          .attr("stroke-width", 2); // 设置边框宽度
    },
    initThumbnail() {
      const thumbnail = d3.select(this.$refs.thumbnailTree);
      thumbnail
          .attr("width", this.thumbnailTreeWidth)
          .attr("height", this.thumbnailTreeHeight)
          .attr("viewBox", `0 0 ${this.thumbnailTreeWidth} ${this.thumbnailTreeHeight}`)
          .attr("preserveAspectRatio", "xMidYMid meet")
          .attr("style", "position: absolute; top: 120px; right: 40px; border: 1px solid #ccc; background: #fff;");
    },
    updateThumbnail() {
      const that = this;
      const thumbnail = d3.select(this.$refs.thumbnailTree);
      thumbnail.selectAll("*").remove();
      const container = thumbnail.append("g")
          .attr("transform", `scale(${that.thumbnailTreeWidth / that.svgWidth}, ${that.thumbnailTreeHeight / that.svgHeight}) translate(0, ${that.svgHeight / 2})`);

      // Clone legend and link nodes
      const legendNode = d3.select(that.$refs.tree).select(`.nodes`).node().cloneNode(true);
      const linkNode = d3.select(that.$refs.tree).select(`#linkTree`).node().cloneNode(true);

      container.append(() => legendNode);
      container.append(() => linkNode);

    },
    initGraph(dataObj) {
      const that = this;
      const width = that.svgWidth;
      // parse data
      const recall = dataObj.metric;
      const data = dataObj.treeData["0"];
      const root = d3.hierarchy(data);

      const dx = 30;
      const dy = width / (root.height + 1);

      const tree = d3.tree().nodeSize([dx, dy]);

      root.sort((a, b) => d3.ascending(a.data.name, b.data.name));
      tree(root);

      let x0 = Infinity;
      let x1 = -x0;
      root.each(d => {
        if (d.x > x1) x1 = d.x;
        if (d.x < x0) x0 = d.x;
      });

      // 打印结果
      const height = Math.max(x1 - x0 + dx * 2, that.svgHeight);

      d3.select(this.$refs["tree"]).selectAll("*").remove();

      const svg = d3.select(this.$refs["tree"])
          .attr("viewBox", [-dy / 2, x0 - dx, width, height])
          .attr("width", width)
          .attr("height", height)
          .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;")
          .call(d3.zoom().on("zoom", (event) => {
            container.attr("transform", event.transform);
          }));

      const container = svg.append("g");
      // .attr("transform", `translate(0, ${dx})`);
      const offheight = -dy / 3;
      const offwidth = x0 + dx / 3 * 2;
      svg.append("text")
          .attr("transform", `translate(${offheight}, ${offwidth})`)
          .attr("font-family", "sans-serif")
          .attr("font-size", 15)
          .text(`Recall: ${recall}`);

      const link = container.append("g")
          .attr("class", "links")
          .attr("id", `linkTree`)
          .attr("fill", "none")
          .attr("stroke", "#555")
          .attr("stroke-opacity", 0.4)
          .attr("stroke-width", 1.5)
          .selectAll()
          .data(root.links())
          .join("path")
          .attr("d", d3.linkHorizontal()
              .x(d => d.y)
              .y(d => d.x));

      const node = container.append("g")
          .attr("class", "nodes")
          .attr("stroke-linejoin", "round")
          .attr("stroke-width", 3)
          .selectAll("g")
          .data(root.descendants())
          .join("g")
          .attr("transform", d => `translate(${d.y},${d.x})`);

// 定义 border 元素
      const border = container.append("g")
          .attr("class", "borders")
          .selectAll("circle")
          .data(root.descendants())
          .join("circle")
          .attr("r", 12)
          .attr("fill", "none")
          .attr("stroke", "none")
          .attr("stroke-width", 2)
          .attr("transform", d => `translate(${d.y},${d.x})`)
          .style("pointer-events", "none"); // 禁止 border 元素接收鼠标事件

// 将 border 元素放在 nodes 后面
      border.raise();

// 事件处理函数
      node.on("mouseover", function (event, d) {
        // console.log("mouseover", d.data.name);

        // 设置 border 元素的样式
        border.attr("stroke", b => b === d ? "#6096E6" : "none");

        // console.log("Node name on mouseover:", d.data.name);
      })
          .on("mouseout", function (event, d) {
            // 移除 border 元素的样式
            border.attr("stroke", "none");
          });


      const groupColorMap = {
        0: "#A4D3EE",
        1: "#FF0000",
        2: "#32CD32",
        3: "#FF7F50",
      };

      node.append("circle")
          .attr("fill", d => groupColorMap[d.data.group] || "#A4D3EE")
          .attr("id", `nodeTree`)
          .attr("r", 10);

      node.on("click", function (event, d) {
        const existingBox = document.querySelector('.option-box');
        if (existingBox) {
          if (parseInt(existingBox.dataset.nodeId) === parseInt(d.id)) {
            existingBox.remove();
            return;
          }
          existingBox.remove();
        }
        const options = d3.select("body").append("div")
            .attr("class", "option-box")
            .attr("data-node-id", d.id)
            .style("position", "absolute")
            .style("left", `${event.pageX + 10}px`)
            .style("top", `${event.pageY + 10}px`)
            .style("display", "flex")
            .style("gap", "8px")
            .style("border", "1px solid #7F7F7F")
            .style("background-color", "#F7F7F7")
            .style("width", "86px")
            .style("height", "25px")
            .style("padding", "2.5px 0")
            .style("padding-left", "8px")
            .style("border-radius", "8px")
            .style("align-items", "center")
            .style("z-index", 1000);
        options.append("div")
            .text("+")
            .style("font-size", "20px")
            .style("color", "#679D43")
            .style("border-radius", "50%")
            .style("width", "20px")
            .style("height", "20px")
            .style("text-align", "center")
            .style("line-height", "20px")
            .style("background-color", "#D4E2C8")
            .on("click", () => console.log("Plus clicked", d));
        options.append("div")
            .text("-")
            .text("-")
            .style("font-size", "20px")
            .style("border-radius", "50%")
            .style("width", "20px")
            .style("height", "20px")
            .style("text-align", "center")
            .style("line-height", "20px")
            .style("background-color", "#D4E2C8")
            .style("color", "#679D43")
            .on("click", () => console.log("Minus clicked"));
        options.append("div")
            .text("A")
            .style("font-size", "14px")
            .style("border-radius", "50%")
            .style("width", "20px")
            .style("height", "20px")
            .style("text-align", "center")
            .style("background-color", "#D4E2C8")
            .style("color", "#679D43")
            .on("click", () => that.convertToImage(event, d));
        d3.select("body").on("click", function (event) {
          if (!event.target.closest('.option-box') && !event.target.closest('circle')) {
            d3.selectAll('.option-box').remove();
          }
        });
        event.stopPropagation();
      });


      node.append("text")
          .attr("dy", "0.31em")
          .attr("x", d => d.children ? 6 : 6)
          .attr("text-anchor", d => d.children ? "end" : "start")
          // .text(d => d.data.name)
          .text(d => {
            if (d.data.group === 2 || d.data.group === 3) {
              return `${d.data.name}`;
            } else {
              return "";
            }
          })
          .attr("stroke", "white")
          .attr("paint-order", "stroke");

      node.append("title")
          .text(d => `ID: ${d.data.name}, Distance: ${d.data.distance}`);

      this.updateThumbnail();

      const legend = svg.append("g")
          .attr("transform", `translate(${offheight}, ${offwidth + 10})`)
          .attr("font-family", "sans-serif")
          .attr("font-size", 10);

      const uniqueGroups = [0, 1, 2, 3];

      const legendItems = legend.selectAll("g")
          .data(uniqueGroups)
          .enter().append("g")
          .attr("transform", (d, i) => `translate(0,${i * 20})`);

      legendItems.append("rect")
          .attr("width", 18)
          .attr("height", 18)
          .attr("fill", d => groupColorMap[d])

      legendItems.append("text")
          .attr("x", 24)
          .attr("y", 9)
          .attr("dy", "0.35em")
          .text(d => {
            if (d === 0) {
              return "normal node";
            } else if (d === 1) {
              return "start node";
            } else if (d === 2) {
              return "gt&search intersection";
            } else if (d === 3) {
              return "search other";
            }
          });

    }

  },
  computed: {
    ...mapState({
      fileName: "fileName",
      selectedTab: "selectedTab",
      dataTree: "dataTree"
    }),

  },
  watch: {
    dataTree(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.treeData = newVal;
        if (this.selectedTab === "TreeView") {
          this.initGraph(this.treeData);
        }
      }

    },
    selectedTab(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.$nextTick(() => {
          this.getViewSize();
          this.initGraph(this.treeData);
          this.initThumbnail();
        });
      }
    }
  }
};
</script>

<style scoped lang="scss">
.tree-main {
  height: 100%;
  width: 100%;
  overflow: auto;

  .tree-svg {
    width: 100%;
    height: 100%;
  }

  .thumbnail-tree-svg {
    position: absolute;
    right: 20px;
    top: 120px;
    border: 1px solid #ccc;
    background: #fff;
  }
}

.option-box {
  border: 1px solid #F7F7F7;
  background-color: #F7F7F7;
  padding: 5px;
  position: absolute;
  z-index: 1000;

  div {
    margin: 2px 0;
    cursor: pointer;
  }

  div:hover {
    background-color: #f0f0f0;
  }
}

.option-button {
  padding: 5px 10px;
  border: 1px solid #000;
  border-radius: 5px;
  cursor: pointer;
  background-color: #f0f0f0;
  font-size: 14px;
  font-family: Arial, sans-serif;
  color: red;
}

.option-button:hover {
  background-color: #e0e0e0;
}
</style>