<template>

    <div class="middle-main">

        <ProcessDialog :visible.sync="isDialogVisible" :percentage="progressPercentage" :processInfo="processInfo"/>

        <div class="header-main">

            <img src="@/assets/icon-move.png" @click="iconClick('icon1')" alt="Icon 1" class="header-icon">
            <img src="@/assets/icon-select.png" @click="iconClick('icon2')" alt="Icon 2" class="header-icon">
            <img src="@/assets/icon-show-image.png" @click="iconClick('icon3')" alt="Icon 3" class="header-icon">
            <img src="@/assets/icon-moon-dark.png" @click="iconClick('icon4')" alt="Icon 4" class="header-icon">

        </div>

        <div class="menu-main">
            <div class="menu">

                <div class="menu-header">

                    <el-button @click="onButtonClick('DisT')" size="mini">DisT</el-button>
                    <el-button @click="onButtonClick('NodeL')" size="mini">NodeL</el-button>
                    <el-button @click="onButtonClick('Tree')" size="mini">Tree</el-button>
                    <el-button @click="onButtonClick('RagG')" size="mini">RagG</el-button>

                </div>
            </div>

        </div>

        <div v-if="this.$store.state.mainView === 'DisT'" class="view-main">
            <distribution-view />
        </div>

        <div v-else-if="this.$store.state.mainView === 'NodeL'" class="view-main">
            <node-link-view />
        </div>

        <div v-else-if="this.$store.state.mainView === 'Tree'" class="view-main">
            <tree-view />
        </div>
        <div v-else-if="this.$store.state.mainView === 'RagG'" class="view-main">
            RagG
        </div>

    </div>

</template>

<script>
import * as d3 from "d3";
import { mapState } from "vuex";
import api from "@/api/data";

import NodeLinkView from "@/views/MainView/MiddleMainView/NodeLinkView";
import TreeView from "@/views/MainView/MiddleMainView/TreeView";
import DistributionView from "@/views/MainView/MiddleMainView/DistributionView";
import ProcessDialog from "@/components/ProcessDialog.vue";

export default {
    name: "MiddleMainView",
    components: {
        NodeLinkView, TreeView, DistributionView, ProcessDialog
    },
    data() {
        return {
            isDialogVisible: false,
            progressPercentage: 0,
            processInfo: "这里只是测试一下先"


        };
    },
    mounted() {


    },
    methods: {
        onButtonClick(data) {
            
            this.$store.commit('setIsDone', { key: data, value: true });
            this.$store.commit('setMainView', data);
            
            console.log("是否执行!!!",)
        },
        async getTraceData(data) {
            // 这里主要是用于获取相应的数据，考虑传入后端的参数

            let res = await api.getDataNodeLink({ "retrievalSet": data })
            this.$store.commit("setDataNodeLink", res["data"])

            let res2 = await api.getDataTree({ "retrievalSet": data })
            this.$store.commit("setDataTree", res2["data"])
            console.log("查看一下是否已经赋值", this.$store.state.dataTree);

        }
    },
    computed: {
        ...mapState({
            isDone: "isDone",
            retrievalInfo: "retrievalInfo",
            retrievalSet: "retrievalSet"


        })

    },
    watch: {
        retrievalInfo: {
            handler(newVal, oldVal) {
                if (this.retrievalInfo.every(item => item && item.imageUrl && item.imagePath)) {
                    this.$store.commit('setIsDone', { key: 'NodeL', value: true });
                    this.$store.commit('setIsDone', { key: 'Tree', value: true });
                    this.getTraceData(this.retrievalSet);
                }
            },
            deep: true
        },
    }
};
</script>

<style scoped lang="scss">
.middle-main {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    position: relative;
}

.header-main {
    width: 100%;
    height: 40px;
    display: flex;
    align-items: center;
    background-color: #f1f0f0;
    box-sizing: border-box;
    padding-left: 40px;
}

.header-icon {
    width: 28px;
    height: 28px;
    box-sizing: border-box;
    cursor: pointer;
    margin-right: 40px;
    /* 增大图标之间的间隔 */
}

.header-icon:last-child {
    margin-right: 0;
}

.menu-main {
    width: 200px;
    height: 200px;
    position: absolute;
    top: 100px;
    right: 10px;
    width: 180px;
    z-index: 1000;
    /* Set a high z-index value */
}

.menu {
    width: 140px;
    height: 56.5px;
    // border: 2px solid #ccc;
    border-radius: 5px;
    z-index: 1000;
}

.menu-header {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0px;
    row-gap: 0px;
    margin-bottom: 0px;
    z-index: 1000;
    /* Set a high z-index value */
}

.view-main {
    width: 100%;
    height: calc(100% - 45px);
}
</style>

<style>
.el-button+.el-button,
.el-checkbox+.el-checkbox.is-bordered {
    margin-left: 0px !important;
}
</style>