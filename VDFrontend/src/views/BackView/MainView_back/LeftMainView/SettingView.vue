<template>

    <div v-if="this.modelName" class="setting-main">

        <el-tabs v-model="activeName">

            <el-tab-pane :key="item" v-for="(item, index) in editableTabs" :label="item" :name="item">

                <div v-if="item === 'REDUCTION'" class="content-main">

                    <div class="select-class">

                        <div class="set-text">Dimension</div>
                        <!-- 使用 Selector 组件 -->
                        <Selector :placeholder1="'Dimension'" :placeholder2="''" :options1="dimensionOptions1"
                            style="margin-top: 10px;" :options2="dimensionOptions2" :isFilterable="false"
                            v-model:value1="selectedDimension1"
                            @selectorChanged="settingChangeRuduction($event, 'dimension')" />
                    </div>
 

                        <div class="select-class">

                            <div class="set-text">Reduction Method</div>
                            <!-- 使用 Selector 组件 -->
                            <Selector :placeholder1="'Reduction Method'" :placeholder2="''"
                                :options1="reductionOptions1" style="margin-top: 10px;" :options2="reductionOptions2"
                                :isFilterable="false" v-model:value1="selectedReduction1"
                                @selectorChanged="settingChangeRuduction($event, 'reductionMethod')" />


                        </div>


                    <div class="select-class">

                        <div class="set-text">Cluster Method</div>
                        <!-- 使用 Selector 组件 -->
                        <Selector :placeholder1="'Cluetr Method'" :placeholder2="''" :options1="clusterOptions1"
                            style="margin-top: 10px;" :options2="clusterOptions2" :isFilterable="false"
                            v-model:value1="selectedCluster1"
                            @selectorChanged="settingChangeRuduction($event, 'clusterMethod')" />
                    </div>

                    <div class="block">
                        <div class="set-text">Neighbors</div>
                        <el-slider v-model="reductionSet['neighbors']" show-input>
                        </el-slider>
                    </div>

                    <div class="block">
                        <div class="set-text">Fiter(%)</div>
                        <el-slider v-model="reductionSet['fiter']" show-input>
                        </el-slider>
                    </div>

                    <div class="btn-sub">
                        <el-button type="primary" @click="handleReduction" plain>RUN</el-button>
                    </div>

                </div>
                <div v-else-if="item === 'RETRIEVAL'" class="content-main">

                    <div class="select-class">

                        <div class="set-text">Index Type</div>
                        <!-- 使用 Selector 组件 -->
                        <Selector :placeholder1="'Index'" :placeholder2="''" :options1="indexOptions1"
                            style="margin-top: 10px;" :options2="indexOptions2" :isFilterable="false"
                            v-model:value1="selectedIndex1" @selectorChanged="settingChange($event, 'indexType')" />
                    </div>

                    <div class="select-class">

                        <div class="set-text">Metric Type</div>
                        <!-- 使用 Selector 组件 -->
                        <Selector :placeholder1="'Metric'" :placeholder2="''" :options1="metricOptions1"
                            style="margin-top: 10px;" :options2="metricOptions2" :isFilterable="false"
                            v-model:value1="selectedMetric1" @selectorChanged="settingChange($event, 'metric')" />
                    </div>


                    <div class="select-class">

                        <div class="set-text">Query Select</div>
                        <div class="container-class" style="display: flex; align-items: center;">
                            <Selector :placeholder1="'Query'" :placeholder2="''" :options1="queryOptions1"
                                :isFilterable="true" style="margin-top: 10px;" :options2="queryOptions2"
                                v-model:value1="selectedQuery1" @selectorChanged="settingChange($event, 'query')" />

                            <!-- <img src="@/assets/icon-update.png" @click="iconClick('icon4')" alt="Icon 4" class="upload-icon"> -->


                        </div>
                    </div>

                    <div class="block">
                        <div class="set-text">TopK</div>
                        <el-slider v-model="retrievalSet['topK']" show-input>
                        </el-slider>
                    </div>

                    <div class="block">
                        <div class="set-text">ValueL</div>
                        <el-slider v-model="retrievalSet['valueL']" show-input>
                        </el-slider>
                    </div>

                    <div class="block">
                        <div class="set-text">ValueK</div>
                        <el-slider v-model="retrievalSet['valueK']" show-input>
                        </el-slider>
                    </div>

                    <div class="btn-sub">
                        <el-button type="primary" @click="handleRetrieval" plain>RETRIEVAL</el-button>
                    </div>

                </div>

            </el-tab-pane>

        </el-tabs>

    </div>

</template>

<script>
import * as d3 from "d3";
import { mapState } from "vuex";
import api from "@/api/data";
import Selector from "@/components/Selector.vue";
import { style } from "d3";

export default {
    name: "SettingView",
    components: {
        Selector
    },
    data() {
        return {
            activeName: "REDUCTION",
            editableTabs: ["REDUCTION", "RETRIEVAL"],
            valueL: 0,
            valueTopk: 0,
            valueK: 0,

            dimensionOptions1: ["Dimension"],
            dimensionOptions2: ["2D", "3D"],
            selectedDimension1: "Dimension",
            selectedDimension2: "",

            reductionOptions1: ["Reduction Method"],
            reductionOptions2: ["UMAPReduction", "PCAReduction", "TSNEReduction"],
            selectedReduction1: "Reduction Method",
            selectedReduction2: "",

            clusterOptions1: ["Cluster Method"],
            clusterOptions2: ["KMeansCluster", "MiniBatchKMeansCluster","None"], //  "DBSCANCluster", "HDBSCANCluster", "BirchCluster",
            selectedCluster1: "Cluster Method",
            selectedCluster2: "",

            indexOptions1: ["Index Type"],
            indexOptions2: ["NSG", "HNSW", "MERGRAPH"],
            selectedIndex1: "Index Type",
            selectedIndex2: "",

            queryOptions1: ["Query"],
            queryOptions2: [1, 2, 3, 4, 5, 6, 7, 8, 89, 90],
            selectedQuery1: "Query",
            selectedQuery2: "",

            metricOptions1: ["Metric"],
            metricOptions2: ["L2", "IP"],
            selectedMetric1: "L2",
            selectedMetric2: "",

            retrievalSet: {
                "datasetName": "",
                "modelName": "",
                "indexType": "",
                "metric": "",
                "query": "",
                "topK": 10,
                "valueL": 60,
                "valueK": 20
            },
            reductionSet: {
                "datasetName": "",
                "modelName": "",
                "dimension": "",
                "neighbors": 10,
                "fiter": 100,
                "reductionMethod": "",
                "clusterMethod": ""
            },

        };
    },
    mounted() {

    },
    methods: {
        async handleRetrieval() {


            this.retrievalSet['datasetName'] = this.$store.state.datasetName;
            this.retrievalSet['modelName'] = this.$store.state.modelName;

            // 开始调用 api
            this.$store.commit("setRetrievalSet", this.retrievalSet);
            const res = await api.getRetrievalRes({ "retrievalSet": this.retrievalSet });
            this.$store.commit("setRetrievaInfo", res['data']['retrievalInfo']);

            let res1 = await api.getDataNodeLink({ "retrievalSet": this.retrievalSet })
            this.$store.commit("setDataNodeLink", res1["data"])

            let res2 = await api.getDataTree({ "retrievalSet": this.retrievalSet })
            this.$store.commit("setDataTree", res2["data"]);

            this.$store.commit('setIsDone', { key: 'NodeL', value: true });
            this.$store.commit('setMainView', "NodeL");

            this.$store.commit("setUpdateTable", true);
        },
        async handleReduction() {

            this.reductionSet['datasetName'] = this.$store.state.datasetName;
            this.reductionSet['modelName'] = this.$store.state.modelName;

            // 开始调用 api
            this.$store.commit("setReductionSet", this.reductionSet);
            const res = await api.getReductionRes({ "reductionSet": this.reductionSet });


            this.$store.commit("setReductionInfo", res["data"]["reductionInfo"]);
            // this.$store.commit("setGridDensity", res["data"]["gridDensity"]);

            this.$store.commit('setIsDone', { key: 'DisT', value: true });
            this.$store.commit('setMainView', "DisT");
            

        },
        settingChangeRuduction(e, strName) {
            this.reductionSet[strName] = e;
        },
        settingChange(e, strName) {
            this.retrievalSet[strName] = e;
        },


    },
    computed: {
        ...mapState({
            fileName: "fileName",
            modelName: "modelName"
        })

    },
    watch: {
    }
};
</script>


<style scoped lang="scss">
.setting-main {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 0px 1px 5px 10px;
    overflow-y: scroll;
}

.setting-main::v-deep .el-tabs__nav-wrap::after {
    display: none !important;
}

.content-main {
    width: 100%;
    height: 100%;
}

.select-class {
    width: 100%;
    height: 50px;
    box-sizing: border-box;
    padding-left: 10px;
    margin-bottom: 20px;
}


.select-class::v-deep.el-progress.el-progress-bar.el-progress-bar__outer .el-progress-bar__inner.el-progress-bar__innerText{
    color: #FFFFFF !important;
}

.block {
    width: 100%;
    height: 40px;
    box-sizing: border-box;
    padding-left: 10px;
    padding-right: 10px;
    margin-bottom: 10px;
}

.set-text {
    font-size: 12px;
}

.upload-icon {
    width: 24px;
    height: 24px;
    box-sizing: border-box;
    margin-left: 12px;
    margin-top: 10px;
}

.btn-sub {
    width: 200px;
    height: 50px;
    box-sizing: border-box;
    display: block;
    /* 转换为块级元素 */
    margin: 20px auto 0;
    /* 上边距 60px，左右居中，下边距 0 */
}

.content-main.block::v-deep .el-input-number--small .el-input-number__decrease,
.content-main.block::v-deep.el-input-number--small .el-input-number__increase {
    width: 20px !important;
    font-size: 10px !important;
}

.content-main.block::v-deep .el-input-number--small {
    width: 85px !important;
    height: 28px !important;
}

.content-main.block::v-deep .el-input-number--small .el-input__inner {
    padding-left: 5px !important;
    padding-right: 5px !important;
}

.content-main.block::v-deep .el-slider__runway.show-input {
    margin-right: 120px !important;
}

.content-main.block::v-deep .el-slider__button {
    width: 12px !important;
    height: 12px !important;

}
</style>
