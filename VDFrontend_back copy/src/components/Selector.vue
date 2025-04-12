<template>
    <div class="selector-main">

        <el-select v-model="value1" :placeholder="placeholder1" class="selector-first" disabled>
            <el-option v-for="item1 in options1" :key="item1" :label="item1" :value="item1">
            </el-option>
        </el-select>

        <el-select v-model="value2" :placeholder="placeholder2" :filterable="isFilterable" allow-create class="selector-second" @change="selectorChange">
            <el-option v-for="item2 in options2" :key="item2" :label="item2" :value="item2" >
            </el-option>
        </el-select>

    </div>
</template>

<script>
export default {
    name: "Selector",
    props: {
        placeholder1: {
            type: String,
            default: "" // 第一个下拉框的默认占位符
        },
        placeholder2: {
            type: String,
            default: "" // 第二个下拉框的默认占位符
        },
        options1: {
            type: Array,
            default: () => [] // 第一个下拉框选项数组，默认为空数组
        },
        options2: {
            type: Array,
            default: () => [] // 第二个下拉框选项数组，默认为空数组
        },
        value1: {
            type: String,
            default: '' // 第一个下拉框的选中值，默认为空字符串
        },
        isFilterable: {
            type: Boolean,
            default: false
        }
    },
    data() {
        return {
            value2: ""

        };
    },
    methods: {
        selectorChange(){
            this.$emit("selectorChanged", this.value2);
        }
    },
    watch: {

    }
};
</script>

<style scoped>
.selector-main>>>.selector-first .el-input__inner {
    width: 100px !important;
    height: 30px !important;
    border-right: none;
    /* 取消最右边的边框 */
    border-radius: 5px 0 0 5px;
    /* 给左上角添加圆角 */
}

.selector-main>>>.selector-second .el-input__inner {
    width: 120px !important;
    height: 30px !important;
    border-radius: 0 5px 5px 0;
    /* 给右上角添加圆角 */
}
</style>
