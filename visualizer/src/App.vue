<script setup lang="ts">
import Graph from 'graphology'
import { Sigma } from 'sigma'
import circular from 'graphology-layout/circular'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { onMounted, useTemplateRef } from 'vue'

import data from './data.json'

const container = useTemplateRef('container')

onMounted(() => {
	if(!container.value) return

	const graph = new Graph({ multi: true })
	// const graph = new Graph()

	for(const io of ['A', 'B', 'S', 'clk', 'en', 'rst_n']) {
		graph.addNode(io, { label: io, x: 0, y: 0, size: 10, color: 'red' })
	}

	const targetCircuit = data.find(circuit => circuit.name === 'adder_demo')!

	for(const instance of targetCircuit.instances) {
		const label = instance.type.startsWith('sky130_fd_sc_hd__') ? instance.type.substring('sky130_fd_sc_hd__'.length) : instance.type

		graph.addNode(instance.name, { label, x: 0, y: 0, size: 10, color: 'blue' })

		for(const port of data.find(circuit => circuit.name === instance.type)!.ports) {
			graph.addNode(instance.name + '/' + port, { label: port, x: 0, y: 0, size: 4, color: 'green' })
			graph.addEdge(instance.name, instance.name + '/' + port, { size: 1, color: 'grey' })
		}
	}

	for(const instance of targetCircuit.instances) {
		for(const port of Object.keys(instance.connections)) {
			const targetInstance = (instance.connections as any)[port].instance
			const targetPort = (instance.connections as any)[port].port

			if(['VPWR', 'VGND'].includes(targetInstance)) continue

			if(targetPort) {
				if(graph.hasEdge(instance.name + '/' + port, targetInstance + '/' + targetPort)) console.warn('Duplicate edge!', instance.name + '/' + port, targetInstance + '/' + targetPort)

				graph.addEdge(instance.name + '/' + port, targetInstance + '/' + targetPort, { size: 1, color: 'green' })
			} else {
				if(graph.hasEdge(instance.name + '/' + port, targetInstance)) console.warn('Duplicate edge!', instance.name + '/' + port, targetInstance)

				graph.addEdge(instance.name + '/' + port, targetInstance, { size: 1, color: 'green' })
			}
		}
	}

	circular.assign(graph)

	forceAtlas2.assign(graph, {
		iterations: 100,
		settings: {
			gravity: 1,
			scalingRatio: 10,
			barnesHutOptimize: true,
		}
	})

	const sigmaInstance = new Sigma(graph, container.value, {
		renderEdgeLabels: true,
	})
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
