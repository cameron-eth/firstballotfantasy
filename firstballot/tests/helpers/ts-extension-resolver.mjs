/**
 * Lets tests import project modules that use extensionless relative imports.
 *
 * Source files are written the way the bundler expects (`from './foo'`), but Node's
 * ESM resolver requires a real filename. Rather than litter the app with `.ts`
 * extensions purely to satisfy the test runner, retry a failed relative resolve with
 * `.ts` appended.
 */
export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context)
  } catch (error) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../')
    const hasExtension = /\.[cm]?[jt]sx?$/.test(specifier)
    if (isRelative && !hasExtension) {
      return nextResolve(`${specifier}.ts`, context)
    }
    throw error
  }
}
