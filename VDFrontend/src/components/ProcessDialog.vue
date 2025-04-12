<template>
    <el-dialog
      :visible.sync="visible"
      width="30%"
      :close-on-click-modal="false"
      :show-close="true"
      custom-class="custom-dialog"
      :modal-append-to-body="true"
    >
      <span slot="title">{{processInfo}}</span>
      <div >
        <el-progress
          :percentage="percentage"
          :text-inside="true"
          :stroke-width="18"
          color="#87CEFA"
          style="width: 80%; margin: 0 auto;"
        ></el-progress>
      </div>
    </el-dialog>
  </template>
  
  <script>
  export default {
    name: "ProcessDialog",
    props: {
      visible: {
        type: Boolean,
        required: true,
      },
      percentage: {
        type: Number,
        required: true,
        default: 0,
      },
      processInfo: {
        type: String,
        required: true,
      }
    },
  };
  </script>
  
  <style scoped>
  .custom-dialog .el-dialog__wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* .custom-dialog .el-dialog {
    margin: 0;
    top: 50%;
    transform: translateY(-50%);
  } */
  </style>
  