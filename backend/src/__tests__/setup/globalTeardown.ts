export default async function globalTeardown() {
  console.log("🧹 Tearing down test environment...");
  // Pool e prisma são fechados pelo processo ao terminar
  // Não forçamos disconnect para evitar "Rust value borrowed" error
}
