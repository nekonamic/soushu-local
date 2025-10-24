<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'

const route = useRoute()
const data = ref<any>(null)

onMounted(async () => {
  const tid = route.params.tid
  console.log(tid)
  try {
    const res = await axios.get('/api/novel', { params: { tid } })
    data.value = res.data
  } catch (err) {
    console.error('请求失败:', err)
  }
})
</script>

<template>
  <div>
    <div class=" flex justify-center mx-4">
      <div class=" w-3xl flex flex-col gap-2">
        <div>
          <h1 class=" text-3xl font-bold">标题</h1>
        </div>
        <div>
          <p class="text-gray-300 text-sm">tid: {{ $route.params.tid }}</p>
        </div>
        <div>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipisicing elit. Inventore sed consequuntur error repudiandae
            numquam deserunt quisquam repellat libero asperiores earum nam nobis, culpa ratione quam perferendis
            esse, cupidita  te neque
            quas!
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
