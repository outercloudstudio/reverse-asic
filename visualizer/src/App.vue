<script setup lang="ts">
import Graph from 'graphology'
import { Sigma } from 'sigma'
import { EdgeArrowProgram } from 'sigma/rendering'
import circular from 'graphology-layout/circular'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { onMounted, useTemplateRef } from 'vue'

import data from './data.json'

const container = useTemplateRef('container')

onMounted(() => {
	if(!container.value) return

	const graph = new Graph({ multi: true, type: 'directed' })
	// const graph = new Graph()

	// for(const io of ['A', 'B', 'S', 'clk', 'en', 'rst_n']) {
	// 	graph.addNode(io, { label: io, x: io === 'S' ? 1000 : -1000, y: 0, size: 10, color: 'red' })
	// }

	const inputPorts = ['A', 'B', 'clk', 'en', 'rst_n', 'VPWR', 'VGND', 'VPB', 'VND']
	const outputPorts = ['S']

	for(const instanceName of Object.keys(data)) {
		const instance = (data as any)[instanceName]

		if(['rst_n', 'en', 'clk'].includes(instanceName)) continue

		let label = instance.type
		let x = Math.random()
		let y = Math.random()
		let color = 'blue'

		if(inputPorts.includes(instanceName)) {
			label = instanceName
			x = -1000
			color = 'red'
		}
		
		if(outputPorts.includes(instanceName)) {
			label = instanceName
			x = 1000
			color = 'red'
		}

		if(instance.type === 'sky130_fd_sc_hd__clkbuf_16') color = 'grey'
		if(instance.type === 'register') color = 'orange'
		if(instance.type === 'sky130_fd_sc_hd__dfrtp_2') color = 'green'
		if(instance.type === 'sky130_fd_sc_hd__mux2_1') color = 'purple'

		graph.addNode(instanceName, { label,  x, y, size: 10, color })
	}

	for(const instanceName of Object.keys(data)) {
		const instance = (data as any)[instanceName]

		if(['rst_n', 'en', 'clk'].includes(instanceName)) continue

		for(const outPort of Object.keys(instance.outPorts)) {
			for(const connection of instance.outPorts[outPort]) {
				if(['rst_n', 'en', 'clk'].includes(connection.name)) continue

				if(!connection.port) {
					graph.addDirectedEdge(instanceName, connection.name, { label: `${outPort} -> ${connection.name}`, size: 1, color: 'grey' }) 

					continue
				}

				graph.addDirectedEdge(instanceName, connection.name, { label: `${outPort} -> ${connection.port}`, size: 1, color: 'grey' })
			}
		}
	}

	// circular.assign(graph)

	forceAtlas2.assign(graph, {
		iterations: 20,
		settings: {
			gravity: 1,
			scalingRatio: 1,
			barnesHutOptimize: true,
			slowDown: 3,
			adjustSizes: false,
		}
	})

	const sigmaInstance = new Sigma(graph, container.value, {
		renderEdgeLabels: true,
		defaultEdgeType: 'arrow',
		edgeProgramClasses: {
			arrow: EdgeArrowProgram,
		},
	})

	let draggedNode: string | null = null
	let isDragging = false

	sigmaInstance.on('downNode', (e) => {
		isDragging = true
		draggedNode = e.node
		graph.setNodeAttribute(draggedNode, 'highlighted', true)

		if (!sigmaInstance.getCustomBBox()) sigmaInstance.setCustomBBox(sigmaInstance.getBBox())
	})

	sigmaInstance.on('moveBody', ({ event }) => {
		if (!isDragging || !draggedNode) return

		const pos = sigmaInstance.viewportToGraph(event)

		graph.setNodeAttribute(draggedNode, 'x', pos.x)
		graph.setNodeAttribute(draggedNode, 'y', pos.y)

		event.preventSigmaDefault()
		event.original.preventDefault()
		event.original.stopPropagation()
	})

	const handleUp = () => {
		if (draggedNode) {
			graph.removeNodeAttribute(draggedNode, 'highlighted')
		}

		isDragging = false
		draggedNode = null
	}

	sigmaInstance.getMouseCaptor().on('mouseup', handleUp)
	sigmaInstance.getMouseCaptor().on('mouseleave', handleUp)
})
</script>

<template>
  <div ref="container" class="container"></div>
</template>

<style scoped>
.container { 
	width: 100vw;
	height: 100vh;
}
</style>
