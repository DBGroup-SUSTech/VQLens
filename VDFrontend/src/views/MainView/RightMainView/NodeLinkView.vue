<template>
    <div id="node-graph-container" class="node-link-main" ref="nodeLinkGraph">
    </div>
</template>

<script>
import d3 from "../../../utils/d3-import";
import { mapState } from "vuex";
import api from "@/api/data";
import { NodeGraph } from "../../../components/Graph/NodeGraph";

export default {
    name: "NodeLinkView",
    components: {},
    data() {
        return {
            nodelinkdata: {},
            width: "",
            height: "",
            nodeGraph: null,

        };
    },
    mounted() {
        this.initNodeGraph();

    },
    methods: {
        initNodeGraph() {

            const dag = this.$refs.nodeLinkGraph;
            this.width = dag.clientWidth * 2;
            this.height = dag.clientHeight * 2;

            const graphContainer = document.getElementById('node-graph-container');
            this.nodeGraph = new NodeGraph({
                component: graphContainer,
                data: this.$store.state.dataNodeLink,
                strengths: {
                    linkStrength: 1,  // 设置适当的链接强度
                    linkDistance: 8,   // 设置适当的链接距离
                    nodeStrength: -5,  // 设置适当的节点强度
                    collideStrength: 5   // 设置适当的碰撞强度

                },
                width: this.width,            // 设置图形宽度
                height: this.height,          // 设置图形高度
                nodeRadius: 6,       // 设置节点半径
                minLinkStrokeWidth: 1, // 设置最小链接宽度 
                maxLinkStrokeWidth: 3,  // 设置最大链接宽度
                selectedNode: this.$store.state.selectedNode
            })

        },
        updateSelectedNode(selectedNode) {
            if (this.nodeGraph) {
                console.log("Selected Node:", selectedNode, this.nodeGraph.nodeElements);

                // 检查节点是否存在
                const nodeData = this.nodeGraph.nodeElements.data();
                const exists = nodeData.some(d => d.id == selectedNode);
                console.log("该点存在！！！！！！！！！！！", exists);
                if (exists) {

                    // 只有在节点存在时才设置样式
                    this.nodeGraph.nodeElements
                        .style('stroke', d => (d.id == selectedNode ? 'yellow' : 'white'))
                        .style('stroke-width', d => (d.id == selectedNode ? 4 : 1.5));
                } else {

                    console.log("Node does not exist:", selectedNode);
                    // 如果节点不存在，重置所有节点的样式
                    this.nodeGraph.nodeElements
                        .style('stroke', 'white') // 所有节点的边框颜色
                        .style('stroke-width', 1.5); // 所有节点的边框宽度
                    console.log("Node does not exist:", selectedNode);
                }
            }

        }
    },
    computed: {
        ...mapState({
            dataNodelink: "dataNodeLink",
            retrievalSet: "retrievalSet",
            datasetName: "datasetName",
            modelName: "modelName",
            retrievalInfo: "retrievalInfo",
            selectedNode: "selectedNode"
        }),
    },
    watch: {
        selectedNode(newVal, oldVal) {
            if (newVal !== oldVal & newVal !== null) {
                this.updateSelectedNode(newVal);
            }



        },
    }
};
</script>

<style scoped lang="scss">
.node-link-main {
    height: 100%;
    width: 100%;
    overflow: auto;
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