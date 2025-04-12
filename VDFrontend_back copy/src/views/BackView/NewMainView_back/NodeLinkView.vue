<template>
  <div v-if="this.$store.state.fileName" class="node-link-main">
    <svg ref="dag" class="dag-svg"></svg>
    <svg ref="thumbnail" class="thumbnail-svg"></svg>
  </div>
</template>

<script>
import * as d3 from "d3";
import {mapState} from "vuex";
import api from "@/api/data";

export default {
  name: "NodeLinkView",
  components: {},
  data() {
    return {
      nodelinkdata: {},
      svgWidth: 0,  // 页面的宽度
      svgHeight: 0,   // 页面高度
      velocityDecay: 0.6,
      thumbnailWidth: 0, // 缩略图宽度
      thumbnailHeight: 0, // 缩略图高度
    };
  },
  mounted() {
    this.getViewSize();
  },
  methods: {
    getViewSize() {
      const dag = this.$refs.dag;
      this.svgHeight = dag.clientHeight;
      this.svgWidth = dag.clientWidth;
      this.thumbnailWidth = this.svgWidth / 5;  // 缩略图宽度和高度分别为整个svg 的1/5
      this.thumbnailHeight = this.svgHeight / 5;
      if (this.nodelinkdata.nodes) {
        this.initGraph(this.nodelinkdata);
        this.initThumbnail();
      }
    },
    async convertToImage(event, node) {
      const res = await api.getImageUrl({"fileName": this.$store.state.fileName, "nodeId": node.id});
      const imageUrl = res["data"]["image_url"];
      const targetElement = d3.select(event.target);
      const targetBBox = targetElement.node().getBBox();
      const targetWidth = targetBBox.width;
      const targetHeight = targetBBox.height;
      const patternId = `pattern-${node.id}`;
      let pattern = d3.select(`#${patternId}`);
      if (pattern.empty()) {
        const svg = d3.select(`#node-class`);
        let defs = svg.select("defs").attr("width", targetWidth).attr("height", targetHeight);
        if (defs.empty()) {
          defs = svg.append("defs").attr("width", targetWidth).attr("height", targetHeight);
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
      targetElement
          .attr("r", 30)
          .attr("fill", `url(#pattern-${node.id})`)
          .attr("stroke", "#000") // 设置边框颜色
          .attr("stroke-width", 2); // 设置边框宽度;

    },
    initThumbnail() {
      const thumbnail = d3.select(this.$refs.thumbnail);
      thumbnail
          .attr("width", this.thumbnailWidth)
          .attr("height", this.thumbnailHeight)
          .attr("viewBox", `0 0 ${this.svgWidth} ${this.svgHeight}`)
          .attr("preserveAspectRatio", "xMidYMid meet")
          .attr("style", "position: absolute; bottom: 20px; left: 20px; border: 1px solid #ccc; background: #fff;");
    },
    updateThumbnail() {
      const that = this;
      const thumbnail = d3.select(that.$refs.thumbnail);
      thumbnail.selectAll("*").remove();
      const container = thumbnail.append("g")
          .attr("transform", `scale(${that.thumbnailWidth / that.svgWidth}, ${that.thumbnailHeight / that.svgHeight})`);

      // Clone legend and link nodes
      const legendNode = d3.select(that.$refs.dag).select("g.nodes").node().cloneNode(true);
      const linkNode = d3.select(that.$refs.dag).select("g.link").node().cloneNode(true);
      container.append(() => legendNode);
      container.append(() => linkNode);

    },

    initGraph(data) {
      const that = this;
      const width = that.svgWidth;
      const height = that.svgHeight;

      const recall = data.metric;
      const links = data.links.map(d => ({...d}));
      const nodes = data.nodes.map(d => ({...d}));

      const simulation = d3.forceSimulation(nodes)
          .force("link", d3.forceLink(links).id(d => d.id).distance(d => d.value+20))
          .force("charge", d3.forceManyBody().strength(-90))
          .force("center", d3.forceCenter(width / 2, height / 2))
          // .force("radial", d3.forceRadial(500, width / 2, height / 2).strength(0.05))
          .force("x", d3.forceX(width / 2).strength(0.05))
          .force("y", d3.forceY(height / 2).strength(0.05))
          .velocityDecay(this.velocityDecay)
          .on("tick", ticked);

      const svg = d3.select(this.$refs.dag);
      svg.selectAll("*").remove();

      svg.attr("viewBox", `0 0 ${width} ${height}`)
          .attr("width", "100%")
          .attr("height", "100%")
          .attr("preserveAspectRatio", "xMidYMid meet")
          .attr("style", "max-width: 100%; height: auto;")
          .call(d3.zoom().scaleExtent([0.5, 8]).on("zoom", zoomed));

      const colorMap = d3.scaleOrdinal()
          .range(['', '#FF0000', '#A4D3EE', '#32CD32', '#FF7F50']);

      const container = svg.append("g");
      const link = container.append("g")
          .attr("class", "link")
          .attr("stroke", "#999")
          .attr("stroke-opacity", 0.6)
          .selectAll("line")
          .data(links)
          .join("line")
          .attr("stroke-width", d => Math.sqrt(d.value / 8))
          .attr("marker-end", "url(#arrowhead)")
          .attr("fill", d => colorMap(d.group));

      const border = container.append("g")
          .selectAll("circle")
          .data(nodes)
          .join("circle")
          .attr("r", v => {
            if (v.group === 1) {
              return 18;
            } else if (v.group === 3) {
              return 15;
            } else if (v.group === 2) {
              return 15;
            } else {
              return 12.5;
            }
          })
          .attr("fill", "none")
          .attr("stroke", "none")
          .attr("stroke-width", 2);

      const node = container.append("g")
          .attr("class", "nodes")
          .attr("id", `node-class`)
          .attr("stroke", "#fff")
          .attr("stroke-width", 0.2)
          .selectAll("circle")
          .data(nodes)
          .join("circle")
          .attr("r", v => {
            if (v.group === 1) {
              return 16;
            } else if (v.group === 3) {
              return 13;
            } else if (v.group === 2) {
              return 13;
            } else {
              return 10.5;
            }
          })
          .attr("fill", d => colorMap(d.group))
          .call(d3.drag()
              .on("start", dragstarted)
              .on("drag", dragged)
              .on("end", dragended));

      const labels = container.append("g")
          .attr("class", "labels")
          .selectAll("text")
          .data(nodes)
          .join("text")
          .attr("dx", 6)
          .attr("dy", ".35em")
          .style("font-size", "12px")  // 设置字体大小
          .attr("stroke", "white")
          .attr("paint-order", "stroke")
          .text(d => {
            if (d.group === 2 || d.group === 3) {
              return `${d.id}`;
            } else {
              return "";
            }
          });

      node.on("mouseover", function (event, d) {
        border.attr("stroke", (b) => b.id === d.id ? "#6096E6" : "none");
      })
          .on("mouseout", function (event, d) {
            border.attr("stroke", "none");
          });

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

      node.append("title")
          .text(d => `ID: ${d.id}, Distance: ${d.distance}`);

      svg.append("text")
          .attr("transform", `translate(60, 50)`)
          .attr("font-family", "sans-serif")
          .attr("font-size", 15)
          .text(`Recall: ${recall}`);

      const legend = svg.append("g")
          .attr("transform", `translate(60, 60)`)
          .attr("font-family", "sans-serif")
          .attr("font-size", 10);

      const uniqueGroups = [...new Set(nodes.map(d => d.group))];
      const legendItems = legend.selectAll("g")
          .data(uniqueGroups)
          .enter().append("g")
          .attr("transform", (d, i) => `translate(0,${i * 20})`);
      legendItems.append("rect")
          .attr("width", 18)
          .attr("height", 18)
          .attr("fill", d => colorMap(d));
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

      function ticked() {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);
        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);
        border
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels
            .attr("x", d => d.x + 2)
            .attr("y", d => d.y + 0.35); // 这里设置文本的位置

        that.updateThumbnail();
      }

      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.2).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }

      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }

      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }

      function zoomed(event) {
        container.attr("transform", event.transform);
        that.updateThumbnail();
      }

    },
  },
  computed: {
    ...mapState({
      fileName: "fileName",
      dataNodelink: "dataNodeLink"
    }),
  },
  watch: {
    dataNodelink(newVal, oldVal) {
      if (newVal !== oldVal) {
        this.nodelinkdata = newVal;
        this.initGraph(this.nodelinkdata);
      }
    }
  }
};
</script>

<style scoped lang="scss">
.node-link-main {
  height: 100%;
  width: 100%;
  overflow: hidden;
  position: relative;

  .dag-svg {
    height: 100%;
    width: 100%;
  }

  .thumbnail-svg {
    position: absolute;
    bottom: 20px;
    left: 20px;
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