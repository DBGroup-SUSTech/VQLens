<template>
    <div v-if="this.$store.state.retrievalSet['topK']" class="result-main">

        <el-collapse accordion>
            <el-collapse-item v-for="(item, index) in getItems" :key="index">
                <template slot="title">
                    {{ item.title }}
                    <!-- <i :class="`header-icon ${item.iconClass}`"></i> -->
                </template>
                <div class="query-main">
                    <div class="res-text">query info</div>
                    <Box v-if="queryItems.length > 0" :items="queryItems" />

                </div>
                <div class="retrieval-main">
                    <div class="res-text">retrieval info</div>
                    <Box v-if="getRetrievalItems.length > 0" :items="getRetrievalItems" />

                </div>
                <!-- <div class="gt-main">
                    <div class="res-text">gt info</div>
                    <Box :items="getSubItems" />
                </div> -->


            </el-collapse-item>
        </el-collapse>

    </div>

</template>


<script>
import * as d3 from "d3";
import { mapState } from "vuex";
import api from "@/api/data";
import Box from "@/components/Box.vue";
import { index } from "d3";


export default {
    name: "ResultView",
    components: {
        Box

    },
    data() {
        return {
            queryItems: [],
            retrievalItems: [],

        }
    },
    methods: {
        async getQueryItems() {

            // 先来构建第一个 query 的结果
            let res = await api.getQueryInfo({ "retrievalSet": this.$store.state.retrievalSet });
            let imageUrl = res['data']['imageUrl']
            let imagePath = res['data']['imagePath']
            let title = `Q1_${this.$store.state.datasetName}_${this.$store.state.modelName}`;
            let iconClass = "el-icon-info";
            let type = 'query';
            let contents = { imageUrl: imageUrl, imagePath: imagePath };

            this.queryItems.push({
                title: title,
                iconClass: iconClass,
                type: type,
                contents: contents
            });
        },
    },
    computed: {
        ...mapState({
            retrievalSet: "retrievalSet",
            datasetName: "datasetName",
            modelName: "modelName",
            retrievalInfo: "retrievalInfo",
            selectedNode: "selectedNode"
        }),
        getItems() {

            const datasetName = this.retrievalSet['datasetName'];
            const modelName = this.retrievalSet['modelName'];
            const indexType = this.retrievalSet['indexType'];
            const metric = this.retrievalSet['metric'];
            const topK = this.retrievalSet['topK'];

            let title = `Q1_${datasetName}_${modelName}_${indexType}_${metric}_Top${topK}`;
            let iconClass = "el-icon-info";

            return [{ "title": title, "iconClass": iconClass }];
        },
        getRetrievalItems() {

            // 先来构建第一个 query 的检索的结果

            this.retrievalInfo.forEach((item, index) => {

                let title = `Q1_${this.$store.state.datasetName}_${this.$store.state.modelName}`;
                let iconClass = "el-icon-info";
                let type = 'retrieval';
                let imageUrl = item['imageUrl']
                let imagePath = item['imagePath'];
                let nodeList = item['nodeIDList']
                let topK = index + 1;
                let contents = { "imageUrl": imageUrl, "imagePath": imagePath };
                let isHighlighted = false;

                this.retrievalItems.push({
                    title: title,
                    iconClass: iconClass,
                    type: type,
                    topK: topK,
                    contents: contents,
                    nodeList: nodeList,
                    isHighlighted: isHighlighted  // 高亮标志
                });

            });
            return this.retrievalItems;
        },

    },

    watch: {
        retrievalSet(newVal) {
            console.log("queryinfo", newVal);
            this.getQueryItems();
            // this.getRetrievalItems();

        }


    },

};
</script>

<style scoped>
.result-main {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}

.res-text {
    font-size: 15px;
}


.result-main::v-deep .el-collapse-item__header {
    font-size: 16px;

}
</style>