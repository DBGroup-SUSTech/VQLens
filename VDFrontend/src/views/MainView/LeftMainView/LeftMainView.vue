<template>

    <div class="left-main">

        <div class="system-icon">
            VQLens
        </div>

        <div class="header-class">
            <div class="data-set-class">
                <data-set-view />
            </div>

            <div class="setting-class">
                <setting-view />
            </div>

        </div>



    </div>

</template>

<script>
import * as d3 from "d3";
import { mapState } from "vuex";
import api from "@/api/data";
import DataSetView from "@/views/MainView/LeftMainView/DataSetView";
import SettingView from "@/views/MainView/LeftMainView/SettingView";

export default {
    name: "LeftMainview",
    components: {
        DataSetView, SettingView
    },
    data() {
        return {

        };
    },
    mounted() {



    },
    methods: {

    },
    computed: {
        ...mapState({
        })

    },
    watch: {
    }
};
</script>

<style scoped lang="scss">
.left-main {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}


.system-icon {
    width: 100%;
    height: 60px;
    box-sizing: border-box;
    color: black;
    padding: 2px 2px;
    border-radius: 5px;
    font-size: 30px;
    font-weight: bold;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: white;
}


.header-class{
    width: 100%;
    height: calc(100% - 60px);
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    gap: 3px;


.data-set-class {
    flex: 0.9;
    width: 100%;
    box-sizing: border-box;
    border-radius: 5px;
    background-color: white;
}

.setting-class {
    flex: 3;
    width: 100%;
    box-sizing: border-box;
    border-radius: 5px;
    background-color: white;
}

}

</style>