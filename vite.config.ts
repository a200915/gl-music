// vite定义的接口
import type { UserConfig, ConfigEnv } from 'vite'
// package.json文件 用于获取项目信息
import pkg from './package.json'
// 第三方包 时间处理
import dayjs from 'dayjs'
// 加载 envDir 中的 .env 文件。默认情况下只有前缀为 VITE_ 会被加载，除非更改了 prefixes 配置
import { loadEnv } from 'vite'
// 拼接相对路径
import { resolve } from 'path'
import { generateModifyVars } from './build/generate/generateModifyVars'
// import { createProxy } from './build/vite/proxy'
import { wrapperEnv } from './build/utils'
import { createVitePlugins } from './build/vite/plugin'
import { OUTPUT_DIR } from './build/constant'

function pathResolve(dir: string) {
  return resolve(process.cwd(), '.', dir)
}

const { dependencies, devDependencies, name, version } = pkg
const __APP_INFO__ = {
  pkg: { dependencies, devDependencies, name, version },
  lastBuildTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
}

export default ({ command, mode }: ConfigEnv): UserConfig => {
  // 获取当前路径
  const root = process.cwd() 

  // 加载环境变量配置 默认只有VITE_开头的会被加载 可以通过第三个参数修改
  const env = loadEnv(mode, root)

  // The boolean type read by loadEnv is a string. This function can be converted to boolean type
  const viteEnv = wrapperEnv(env)
  
  const { VITE_PORT, VITE_PUBLIC_PATH, VITE_PROXY, VITE_DROP_CONSOLE } = viteEnv

  // 判断是否打包生产
  const isBuild = command === 'build'

  return {
    // 开发或生产环境服务的公共基础路径
    base: VITE_PUBLIC_PATH,
    // 项目根目录（index.html 文件所在的位置）
    root,
    // 共享选项配置
    resolve: {
      // 路径别名设置
      alias: [
        {
          find: 'vue-i18n',
          replacement: 'vue-i18n/dist/vue-i18n.cjs.js',
        },
        // /@/xxxx => src/xxxx
        {
          find: /\/@\//,
          replacement: pathResolve('src') + '/',
        },
        // /#/xxxx => types/xxxx
        {
          find: /\/#\//,
          replacement: pathResolve('types') + '/',
        },
      ],
    },
    // 服务器选项
    server: {
      // 启用 TLS + HTTP/2
      https: true,
      // Listening on all local IPs 监听所有地址
      host: true,
      // 端口号
      port: VITE_PORT,
      // Load proxy configuration from .env 为开发服务器配置自定义代理规则 暂时不用
      // proxy: createProxy(VITE_PROXY),
    },
    // esbuild配置
    esbuild: {
      pure: VITE_DROP_CONSOLE ? ['console.log', 'debugger'] : [],
    },
    // 构建选项
    build: {
      target: 'es2015',
      cssTarget: 'chrome80',
      // 输出路径
      outDir: OUTPUT_DIR,
      // minify: 'terser',
      /**
       * 当 minify=“minify:'terser'” 解开注释
       * Uncomment when minify="minify:'terser'"
       */
      // terserOptions: {
      //   compress: {
      //     keep_infinity: true,
      //     drop_console: VITE_DROP_CONSOLE,
      //   },
      // },
      // Turning off brotliSize display can slightly reduce packaging time
      brotliSize: false, // 位置
      // 规定触发警告的 chunk 大小限制 kbs
      chunkSizeWarningLimit: 2000,
    },
    define: {
      // setting vue-i18-next
      // Suppress warning
      __INTLIFY_PROD_DEVTOOLS__: false,
      __APP_INFO__: JSON.stringify(__APP_INFO__),
    },

    css: {
      preprocessorOptions: {
        less: {
          modifyVars: generateModifyVars(),
          javascriptEnabled: true,
        },
      },
    },

    // The vite plugin used by the project. The quantity is large, so it is separately extracted and managed
    plugins: createVitePlugins(viteEnv, isBuild),

    optimizeDeps: {
      // @iconify/iconify: The dependency is dynamically and virtually loaded by @purge-icons/generated, so it needs to be specified explicitly
      include: [
        '@vue/runtime-core',
        '@vue/shared',
        '@iconify/iconify',
        'ant-design-vue/es/locale/zh_CN',
        'ant-design-vue/es/locale/en_US',
      ],
    },
  }
}
