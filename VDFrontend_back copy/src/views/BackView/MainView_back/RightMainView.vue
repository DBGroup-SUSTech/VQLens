<template>

    <div class="right-main">
        History View

        

        <!-- <el-tabs v-model="activeName">

            <el-tab-pane :key="item" v-for="(item, index) in editableTabs" :label="item" :name="item">

                <div v-if="item === 'Cluster'" class="content-main">
                    Cluster
                </div>
                <div v-else-if="item === 'Result'" class="content-main">
                    <result-view/>

                  
                </div>

            </el-tab-pane>

        </el-tabs> -->

    </div>

</template>

<script>

import * as d3 from "d3";
import { mapState } from "vuex";
import api from "@/api/data";
import ResultView from "@/views/MainView/RightMainView/ResultView.vue";
// import SettingView from "@/views/MainView/LeftMainView/SettingView";


export default {
    name: "RightMainView",
    components: {
        ResultView

    },
    data(){
        return {
            activeName: "Result",
            editableTabs: ["Cluster","Result"]
        };
    },
    
};


</script>

<style scoped lang="scss">
.right-main {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 0px 1px 5px 10px;
}




</style>