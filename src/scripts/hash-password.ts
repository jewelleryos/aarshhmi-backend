export {}

const password = process.argv[2]

if (!password) {
  console.error('Usage: bun run src/scripts/hash-password.ts <password>')
  process.exit(1)
}

const hash = await Bun.password.hash(password, {
  algorithm: 'bcrypt',
  cost: 12,
})

console.log('Password:', password)
console.log('Hash:', hash)
