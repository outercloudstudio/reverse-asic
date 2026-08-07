type CircuitGraph = Record<string, { type: string, inPorts: Record<string, { name: string, port: string }>, outPorts: Record<string, { name: string, port: string }[]> }>

// class Circuit {
// 	private constructor(public name: string, public ports: string[], public graph: CircuitGraph) {}

// 	public static parse(lines: string[], circuitDefinitions: { name: string, ports: string[] }[]): Circuit {
// 		const items = lines[0].split(' ')
// 		const name = items[1]
// 		const ports = items.slice(2)

// 		if(name !== 'adder_demo') {
// 			return new Circuit(name, ports, {})
// 		}

// 		const instances: { name: string, type: string, connections: Record<string, { instance: string, port: string }> }[] = []

// 		for(const line of lines.slice(1)) {
// 			const instanceItems = line.split(' ')

// 			const instanceName = instanceItems[0].slice(1)
// 			const instanceType = instanceItems[instanceItems.length - 1]

// 			const connections: Record<string, { instance: string, port: string }> = {}

// 			for(let index = 0; index < instanceItems.length - 2; index++) {
// 				const connectionId = instanceItems[index + 1]
// 				const connectionInstance = connectionId.split('/')[0]
// 				const connectionPort = connectionId.split('/')[1]

// 				if(!connectionPort) {
// 					connections[circuitDefinitions.find(circuit => circuit.name === instanceType)!.ports[index]] = { instance: connectionInstance, port: connectionPort }
// 				} else {
// 					connections[circuitDefinitions.find(circuit => circuit.name === instanceType)!.ports[index]] = { instance: connectionInstance, port: connectionPort }
// 				}
// 			}
			
// 			instances.push({
// 				name: instanceName,
// 				type: instanceType,
// 				connections
// 			})
// 		}

// 		const visited: Set<string> = new Set()
// 		visited.add('S')
// 		const frontier: string[] = []
// 		frontier.push('S')

// 		const outputPorts: Record<string, Set<string>> = {}

// 		// while(frontier.length > 0) {
// 		// 	const node = frontier.shift()

// 		// 	const otherConnections = instances.filter(instance => Object.values(instance.connections).some(connection => connection.instance === node))

// 		// 	for(const connection of otherConnections) {
// 		// 		if(visited.has(connection.name)) continue

// 		// 		if(!outputPorts[connection.name]) outputPorts[connection.name] = new Set()
				
// 		// 		for(const port of Object.keys(connection.connections)) {
// 		// 			if(connection.connections[port].instance !== node) continue

// 		// 			outputPorts[connection.name].add(port)
// 		// 		}

// 		// 		frontier.push(connection.name)
// 		// 		visited.add(connection.name)
// 		// 	}

// 		// 	const instance = instances.find(instance => instance.name === node)

// 		// 	if(!instance) continue

// 		// 	const connections = Object.values(instance.connections)

// 		// 	for(const connection of connections) {
// 		// 		if(visited.has(connection.instance)) continue

// 		// 		if(!outputPorts[connection.instance]) outputPorts[connection.instance] = new Set()
// 		// 		outputPorts[connection.instance].add(connection.port)

// 		// 		frontier.push(connection.instance)
// 		// 		visited.add(connection.instance)
// 		// 	}
// 		// }

// 		const graph: CircuitGraph = {}

// 		// for(const instance of instances) {
// 		// 	const otherConnections = instances.filter(instance => Object.values(instance.connections).some(connection => connection.instance === instance.name))
// 		// 	const connections = Object.keys(instance.connections)

// 		// 	const inPorts: Record<string, { name: string, port: string }> = {}
// 		// 	const outPorts: Record<string, { name: string, port: string }> = {}

// 		// 	const instanceOutputPorts = outputPorts[instance.name]

// 		// 	for(const connection of otherConnections) {
// 		// 		for(const port of Object.keys(connection.connections)) {
// 		// 			if(connection.connections[port].instance !== instance.name) continue

// 		// 			if(instanceOutputPorts.has(connection.connections[port].port)) {
// 		// 				outPorts[connection.connections[port].port] = { name: connection.name, port: port }
// 		// 			} else {
// 		// 				inPorts[connection.connections[port].port] = { name: connection.name, port: port }
// 		// 			}
// 		// 		}
// 		// 	}

// 		// 	for(const port of connections) {
// 		// 		if(instanceOutputPorts.has(port)) {
// 		// 			outPorts[port] = { name: instance.connections[port].instance, port: instance.connections[port].port }
// 		// 		} else {
// 		// 			inPorts[port] = { name: instance.connections[port].instance, port: instance.connections[port].port }
// 		// 		}
// 		// 	}

// 		// 	graph[instance.name] = {
// 		// 		type: instance.type,
// 		// 		inPorts,
// 		// 		outPorts
// 		// 	}
// 		// }

// 		console.log(graph)

// 		return new Circuit(name, ports, graph)
// 	}
// }

class Circuit {
	public constructor(public name: string, public inPorts: string[], public outPorts: string[], public graph: CircuitGraph) {}
	
	public static parse(lines: string[], inPorts: string[], outPorts: string[], circuits: Circuit[], circuitDefinitions: Record<string, { ports: string[], lines: string[] }>): Circuit {
		const items = lines[0].split(' ')
		const name = items[1]

		const instances: Record<string, { type: string, connections: Record<string, string> }> = {}

		for(const line of lines.slice(1)) {
			const instanceItems = line.split(' ')

			const instanceName = instanceItems[0].slice(1)
			const instanceType = instanceItems[instanceItems.length - 1]

			const connections: Record<string, string> = {}

			for(let index = 0; index < instanceItems.length - 2; index++) {
				const connectionId = instanceItems[index + 1]

				connections[circuitDefinitions[instanceType].ports[index]] = connectionId
			}
			
			instances[instanceName] = {
				type: instanceType,
				connections
			}
		}

		const graph: CircuitGraph = {}

		const visited: Set<string> = new Set()
		const frontier: string[] = []

		for(const port of inPorts) {
			if(['VPWR', 'VGND'].includes(port)) continue

			visited.add(port)
			frontier.push(port)
		}

		while(frontier.length > 0) {
			const name = frontier.shift()!

			const instance = instances[name]

			if(instance) {
				const circuit = circuits.find(circuit => circuit.name === instance.type)
				
				if(!circuit) throw new Error(`Unknown circuit type ${instance.type}!`)
					
				graph[name] = {
					type: circuit.name,
					inPorts: {},
					outPorts: {}
				}

				for(const port of Object.keys(instance.connections)) {
					if(!circuit.outPorts.includes(port)) continue

					const connectionId = instance.connections[port]

					if(outPorts.includes(connectionId)) {
						if(!graph[name].outPorts[port]) graph[name].outPorts[port] = []
						graph[name].outPorts[port].push({ name: connectionId, port })

						if(visited.has(connectionId)) continue
					
						visited.add(connectionId)
						frontier.push(connectionId)
					} else {
						const connectingInstances = Object.entries(instances).filter(([_, instance]) => Object.values(instance.connections).some(connection => connection === connectionId)).map(([otherName, _]) => otherName)

						for(const otherName of connectingInstances) {
							if(!graph[name].outPorts[port]) graph[name].outPorts[port] = []
							graph[name].outPorts[port] = graph[name].outPorts[port].concat(
								Object.entries(instances[otherName].connections).filter(([_, connection]) => connection === connectionId).map(([port, _]) => ({ name: otherName, port }))
							)
							
							if(visited.has(otherName)) continue
							
							visited.add(otherName)
							frontier.push(otherName)
						}
					}
				}
			} else {
				const connectingInstances = Object.entries(instances).filter(([_, instance]) => Object.values(instance.connections).some(connection => connection === name)).map(([otherName, _]) => otherName)

				graph[name] = {
					type: name,
					inPorts: {},
					outPorts: {}
				}

				if(outPorts.includes(name)) continue

				for(const otherName of connectingInstances) {
					if(!graph[name].outPorts[name]) graph[name].outPorts[name] = []
					graph[name].outPorts[name].push({ name: otherName, port: Object.entries(instances[otherName].connections).find(([port, connection]) => connection === name)![0] })
					
					if(visited.has(otherName)) continue
					
					visited.add(otherName)
					frontier.push(otherName)
				}
			}
		}

		return new Circuit(name, inPorts, outPorts, graph)
	}
}

const CIRCUIT_DEFINITIONS: Circuit[] = [
	new Circuit('sky130_fd_sc_hd__mux2_1', ['S', 'A0', 'A1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	
	new Circuit('sky130_fd_sc_hd__and3_2', ['A', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__xor2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and4bb_2', ['A_N', 'B_N', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	
	new Circuit('sky130_fd_sc_hd__nand2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__xnor2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	
	new Circuit('sky130_fd_sc_hd__a21bo_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a21o_2', ['A1', 'A2', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a31o_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a21boi_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o21bai_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),

	new Circuit('sky130_fd_sc_hd__dfrtp_2', ['D', 'CLK', 'RESET_B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Q'], {}),

	new Circuit('sky130_fd_sc_hd__decap_3', ['VPWR', 'VGND', 'VPB', 'VND'], [], {}),
	new Circuit('sky130_fd_sc_hd__clkbuf_16', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
]

class Project {
	private constructor(public circuits: Circuit[]) {}

	public static parse(text: string) {
		const circuitDefinitions: Record<string, { ports: string[], lines: string[] }> = {}

		const circuits: Circuit[] = []
		let circuitContent: string[] = []
		let withinCircuit = false

		for(let line of text.split('\n')) {
			line = line.trim()

			if(line.length === 0) continue

			if(line.startsWith('.subckt')) {
				withinCircuit = true

				circuitContent = [ line ]

				continue
			}

			if(line.startsWith('+')) {
				circuitContent[circuitContent.length - 1] += ' ' + line.slice(2)

				continue
			}

			if(line.startsWith('.ends')) {
				withinCircuit = false

				const items = circuitContent[0].split(' ')
				const name = items[1]
				const ports = items.slice(2)

				circuitDefinitions[name] = { ports, lines: circuitContent }

				continue
			}

			if(withinCircuit) {
				circuitContent.push(line)
			}
		}

		circuits.push(Circuit.parse(circuitDefinitions['adder_demo'].lines, ['A', 'B', 'clk', 'en', 'rst_n', 'VGND', 'VPWR'], ['S'], CIRCUIT_DEFINITIONS, circuitDefinitions))

		return new Project(circuits)
	}
}

const spiceSource = await Deno.readTextFile('./adder_demo.spice')
const project = Project.parse(spiceSource)

await Deno.writeTextFile('../visualizer/src/data.json', JSON.stringify(project.circuits.find(circuit => circuit.name === 'adder_demo')?.graph, null, 2))