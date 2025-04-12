<template>

    <div class="bottom-main">

        <div class="table-class">
            <table-main-view/>
        </div>

        <div class="other-class">
            
        </div>

    </div>

</template>

<script>
import * as d3 from "d3";
import { mapState } from "vuex";
import api from "@/api/data";
import TableMainView from "@/views/MainView/BottomMainView/TableMainView";

export default {
    name: "BottomMainview",
    components: {
        TableMainView
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
.bottom-main {
    display: flex;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
}

.table-class{

    flex: 1;
    margin-right: 2.5px;
    background-color: white;
    border-right: 5px;
    border-radius: 5px;

}

.other-class{
    flex: 1;
    margin-left: 2.5px;
    background-color: white;
    border-top-left-radius: 5px;
    border-bottom-left-radius: 5px;
}
</style>