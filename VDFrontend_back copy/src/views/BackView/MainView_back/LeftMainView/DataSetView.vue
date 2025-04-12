<template>

    <div class="data-set-main">

        <div class="data-set">
            <div class="data-set-text">DataSet</div>
            <div>
                <!-- 暂时这里是一个下拉框 -->

                <el-select v-model="selectedData" placeholder="UPLOAD DATASET" class="custom-select">
                    <el-option-group v-for="group in this.dataOptions" :key="group.label" :label="group.label">
                        <el-option v-for="item in group.options" :key="item.value" :label="item.value"
                            :value="item.value">
                            <span class="fixed-width-option">{{ `${item.value} | ${item.length}` }}</span>
                        </el-option>
                    </el-option-group>
                </el-select>

            </div>
        </div>

        <div class="embedding-model">
            <div class="embedding-text">Embedding Model</div>
            <div>
                <!-- 暂时这里是一个下拉框 -->

                <el-select v-model="selectedModel" placeholder="UPLOAD EMBEDDING MODEL" class="custom-select-embedding">
                    <el-option-group v-for="group in this.modelOptions" :key="group.label" :label="group.label">
                        <el-option v-for="item in group.options" :key="item.value" :label="item.value"
                            :value="item.value">
                            <span class="fixed-width-option">{{ `${item.value} | ${item.dim}` }}</span>
                        </el-option>
                    </el-option-group>
                </el-select>

            </div>

        </div>
    </div>

</template>

<script>

import * as d3 from "d3";
import { mapState } from "vuex";
import api from "@/api/data";

export default {
    name: "DataSetView",
    components: {

    },
    data() {
        return {
            selectedData: "",
            selectedModel: "",
            dataOptions: [],
            modelOptions: [],
        };
    },
    mounted() {
        this.getDataNames();
    },
    methods: {
        async getDataNames() {
            const reponse = await api.getDataNames();
            this.dataOptions = reponse["data"]["dataSetOptions"];
        },
        async getModelNames(data) {
            const reponse = await api.getModelNames({ "dataName": data });
            this.modelOptions = reponse["data"]["modelOptions"];
        }
    },
    computed: {
        ...mapState({
            datasetName: "datasetName",
        })

    },
    watch: {
        selectedData(newVal, oldVal) {
            if (newVal != oldVal) {
                this.$store.commit("setDatasetName", newVal);
                this.modelOptions = [],
                this.selectedModel = "",
                this.getModelNames(newVal);
            }
        },
        selectedModel(newVal, oldVal){
            if (newVal != oldVal) {
                this.$store.commit("setModelName", newVal);
            }
        }
    }
};
</script>


<style scoped lang="scss">
.data-set-main {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}

.data-set {
    width: 100%;
    height: 80px;
    box-sizing: border-box;
    padding: 5px 5px 20px 20px;
}

.data-set-text {
    width: 100%;
    height: 15px;
    box-sizing: border-box;
    font-size: 15px;
    display: flex;
    font-weight: bold;
    /* 设置字体加粗 */
    justify-content: center;
    align-items: center;
    color: black;
    text-align: center;
}

.custom-select {
    width: 100%;
    height: 60px;
    box-sizing: border-box;
    padding-left: 20px;
    padding-right: 20px;
    padding-top: 8px;
    margin-bottom: 5px;
}

.fixed-width-option {
    font-family: monospace;
    /* 使用等宽字体 */
    white-space: pre;
    /* 保持空格和换行 */
}

.embedding-model {
    width: 100%;
    height: 80px;
    box-sizing: border-box;
    padding: 5px 5px 20px 20px;
}

.embedding-text {
    width: 100%;
    height: 15px;
    box-sizing: border-box;
    font-size: 15px;
    display: flex;
    font-weight: bold;
    /* 设置字体加粗 */
    justify-content: center;
    align-items: center;
    color: black;
    text-align: center;
}

.custom-select-embedding {
    width: 100%;
    height: 60px;
    box-sizing: border-box;
    padding-left: 20px;
    padding-right: 20px;
    padding-top: 8px;
}

.meta-data-info {
    width: 100%;
    height: calc(100% - 160px);
    box-sizing: border-box;
    padding: 5px 5px 20px 20px;
}
</style>