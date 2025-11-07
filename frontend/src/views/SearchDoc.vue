<script setup lang="ts">
</script>
<template>
  <div class="min-h-screen bg-gray-50 py-8 flex flex-col justify-center relative overflow-hidden lg:py-12">
    <img src="/img/beams.webp" alt="" class="fixed top-48 left-1/2 -translate-x-2/3 -translate-y-1/2 max-w-none"
      width="1308" />
    <div
      class="absolute inset-0 bg-[url(/img/grid.svg)] bg-top [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]">
    </div>
    <div
      class="relative w-full px-6 py-12 bg-white shadow-xl shadow-slate-700/10 ring-1 ring-gray-900/5 md:max-w-3xl md:mx-auto lg:max-w-4xl lg:pt-16 lg:pb-28">
      <div class="mt-8 prose prose-slate mx-auto lg:prose-lg">
        <h2>大図書館查阅指南</h2>
        <hr />
        <ul>
          <li>
            <p><strong>简单搜索</strong></p>
            <p>搜索<code>初音 未来</code> 将被视为两个分开的关键词<code>初音</code>和<code>未来</code>。用空格分离关键词的默认情况下会将其视为逻辑或运算，将匹配所有包含<code>初音</code>或<code>未来</code> 同时包含这两个词的文档。</p>
          </li>
          <li>
            <p><strong>布尔运算符<code>AND</code><code>OR</code></strong></p>
            <p>如果想搜索同时包含<code>初音</code>与<code>未来</code>或包含<code>东方</code>，可以搜索<code>(初音 AND 未来) OR 东方</code>。注意，<code>AND</code>的优先级高于<code>OR</code>，因此<code>a AND b OR c</code>会被解释为<code>(a AND b) OR c</code></p>
          </li>
          <li>
            <p><strong><code>-</code>与<code>+</code></strong></p>
            <p>使用这两个运算符可以表达所有使用布尔运算符的查询。例如<code>x AND y OR z</code>可以写成<code>(+x +y) z</code>。</p>
          </li>
          <li>
            <p><strong>否定运算符<code>-</code></strong></p>
            <p>通过在关键词前添加<code>-</code>，可以将该关键词从搜索中排除。列如，想搜索包含<code>初音</code>但不包含<code>未来</code>，即<code>初音 -未来</code>。</p>
          </li>
          <li>
            <p><strong>短语运算符<code>"</code>或<code>'</code></strong></p>
            <p>例如，搜索<code>"初音未来"</code>只会找到连续包含<code>初音未来</code>的文档。单引号同样适用。若关键词包含引号字符，可使用反斜杠<code>\</code>进行转义。</p>
          </li>
          <li>
            <p><strong>通过附加<code>^</code>来提升权重</strong></p>
            <p>例如，<code>初音^2.0 OR 未来^0.4</code>会提升包含<code>初音</code>的文档的权重，降低包含<code>未来</code>的文档的权重。权重提升不允许使用负数。</p>
          </li>
          <li>
            <p><strong>短语运算符<code>"</code>或<code>'</code>可以使用松弛运算符<code>~</code>设置关键词的匹配距离</strong></p>
            <p>例如：<code>"初音未来"~1</code>将匹配包含短语<code>初音未来唱歌</code>的文档，距离以词为单位。</p>
          </li>
          <li>
            <p><strong>短语运算符<code>"</code>或<code>'</code>支持使用前缀运算符<code>*</code></strong></p>
            <p>该运算符将关键词匹配切换为考虑所有将最后一个关键词作为前缀的文档，例如<code>"初音未"* </code>将匹配到<code>初音未来</code>。</p>
          </li>
        </ul>
      </div>
    </div>
  </div>

</template>
<style scoped></style>