<template>

    <div class="middle-main" id="middle-main">

        <div class="header-main">

            <img src="@/assets/icon-contour.png" @click="iconClick('contour')" alt="contour" class="header-icon"
                title="Contour">
            <img src="@/assets/icon-points.png" @click="iconClick('points')" alt="points" class="header-icon"
                title="Points">
            <img src="@/assets/icon-grid.png" @click="iconClick('grid')" alt="grid" class="header-icon" title="Grid">
            <img src="@/assets/icon-label.png" @click="iconClick('label')" alt="label" class="header-icon"
                title="Label">
            <img src="@/assets/icon-save-div.png" @click="iconClick('save')" alt="save" class="header-icon"
                title="Save">
            <img src="@/assets/icon-trace.png" @click="iconClick('trace')" alt="trace" class="header-icon"
                title="Trace">

        </div>

        <div v-if="this.$store.state.dataURLs.grid" class="view-main">
            <distribution-view />
        </div>

    </div>

</template>

<script>
import { mapState } from "vuex";
import api from "@/api/data";
import DistributionView from "@/views/MainView/MiddleMainView/DistributionView";
import ProcessDialog from "@/components/ProcessDialog.vue";
import html2canvas from 'html2canvas';

export default {
    name: "MiddleMainView",
    components: {
        DistributionView, ProcessDialog
    },
    data() {
        return {

        };
    },
    mounted() {


    },
    methods: {
        onButtonClick(data) {

            this.$store.commit('setIsDone', { key: data, value: true });
            this.$store.commit('setMainView', data);
        },
        async getTraceData(data) {
            // 这里主要是用于获取相应的数据，考虑传入后端的参数

            let res = await api.getDataNodeLink({ "retrievalSet": data })
            this.$store.commit("setDataNodeLink", res["data"])

            let res2 = await api.getDataTree({ "retrievalSet": data })
            this.$store.commit("setDataTree", res2["data"])

        },
        iconClick(act) {
            if (act == "save") {
                const element = document.getElementById("middle-main");
                html2canvas(element).then(canvas => {
                    const dataURL = canvas.toDataURL();
                    this.$store.commit("setImageDivList", { "act": "add", "imageUrl": dataURL });
                });
                this.$store.commit('setIconShow', act);

            } else if (act == 'contour') {
                this.$store.commit('setIconShow', act);

            } else if (act == 'points') {
                this.$store.commit('setIconShow', act);

            } else if (act == 'grid') {
                this.$store.commit('setIconShow', act);

            } else if (act == 'label') {
                this.$store.commit('setIconShow', act);

            } else if (act == 'trace') {
                this.$store.commit('setIconShow', act);
            }
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
        // retrievalInfo: {
        //     handler(newVal, oldVal) {
        //         if (this.retrievalInfo.every(item => item && item.imageUrl && item.imagePath)) {
        //             this.$store.commit('setIsDone', { key: 'NodeL', value: true });
        //             this.$store.commit('setIsDone', { key: 'Tree', value: true });
        //             this.getTraceData(this.retrievalSet);
        //         }
        //     },
        //     deep: true
        // },
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
    height: 30px;
    display: flex;
    align-items: center;
    background-color:  #e0e0e0;
    box-sizing: border-box;
    padding-left: 40px;
    border-top-left-radius: 3px;  /* 左上角圆角 */
    border-top-right-radius: 3px; /* 右上角圆角 */
    border: 1px solid #e0e0e0; /* 中灰色边框 */
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
    height: calc(100% - 30px);
}
</style>

<style>
.el-button+.el-button,
.el-checkbox+.el-checkbox.is-bordered {
    margin-left: 0px !important;
}
</style>