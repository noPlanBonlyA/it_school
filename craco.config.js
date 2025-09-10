const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env }) => {
      if (env === 'production') {
        // Настраиваем CSS minimizer для максимальной совместимости
        const cssMinimizerIndex = webpackConfig.optimization.minimizer.findIndex(
          plugin => plugin.constructor.name === 'CssMinimizerPlugin'
        );
        
        if (cssMinimizerIndex !== -1) {
          webpackConfig.optimization.minimizer[cssMinimizerIndex] = new CssMinimizerPlugin({
            minimizerOptions: {
              preset: [
                'default',
                {
                  // Минимальные настройки минификации
                  discardComments: { removeAll: true },
                  normalizeWhitespace: true,
                  // Отключаем все продвинутые оптимизации
                  calc: false,
                  colormin: false,
                  convertValues: false,
                  discardDuplicates: false,
                  discardEmpty: false,
                  discardOverridden: false,
                  mergeIdents: false,
                  mergeLonghand: false,
                  mergeRules: false,
                  minifyFontValues: false,
                  minifyGradients: false,
                  minifyParams: false,
                  minifySelectors: false,
                  normalizeCharset: false,
                  normalizeDisplayValues: false,
                  normalizePositions: false,
                  normalizeRepeatStyle: false,
                  normalizeString: false,
                  normalizeTimingFunctions: false,
                  normalizeUnicode: false,
                  normalizeUrl: false,
                  orderedValues: false,
                  reduceIdents: false,
                  reduceInitial: false,
                  reduceTransforms: false,
                  svgo: false,
                  uniqueSelectors: false,
                  zindex: false,
                }
              ]
            }
          });
        }
      }
      return webpackConfig;
    }
  }
};