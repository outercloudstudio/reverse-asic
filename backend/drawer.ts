import { createCanvas } from 'https://deno.land/x/canvas/mod.ts'
import constraints from './constraints.json' with { type: 'json' }

const canvas = createCanvas(1100, 1100)
const ctx = canvas.getContext('2d')

const filledTiles = new Set()

for(const group of constraints) {
	const color = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`
	ctx.fillStyle = color

	for(const item of group) {
		const [x, y] = item.split(', ').map(item => parseInt(item))

		if(filledTiles.has(item)) console.log('Duplicate at', item)
		filledTiles.add(item)

		ctx.fillRect(x * 100, y * 100, 100, 100)
	}
}

let combinations = 1

for(const group of constraints) {
	combinations *= group.length * (group.length - 1)
}

console.log(combinations)

const buffer = canvas.toBuffer()
await Deno.writeFile('grid.png', buffer)