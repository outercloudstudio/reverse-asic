type CircuitGraph = Record<string, { type: string, inPorts: Record<string, { name: string, port: string }>, outPorts: Record<string, { name: string, port: string }[]> }>

function closeConnection(graph: CircuitGraph, input: { name: string, port: string }, cut: string, outputs: { name: string, port: string }[]) {
	const index = graph[input.name].outPorts[input.port].findIndex(connection => connection.name === cut)
	graph[input.name].outPorts[input.port].splice(index, 1)
	graph[input.name].outPorts[input.port] = graph[input.name].outPorts[input.port].concat(outputs.filter(output => !graph[input.name].outPorts[input.port].some(otherOutput => otherOutput.name === output.name && otherOutput.port === output.port)))
	
	for(const connection of outputs) {
		graph[connection.name].inPorts[connection.port] = input
	}
}

// function fixOutConnection(graph: CircuitGraph, target: string, from: { name: string, port: string }, to: { name: string, port: string }[]) {
// 	const index = graph[from.name].outPorts[from.port].findIndex(connection => connection.name === target)
// 	graph[from.name].outPorts[from.port].splice(index, 1)
// 	graph[from.name].outPorts[from.port] = graph[from.name].outPorts[from.port].concat(to)
// }

// function fixInConnection(graph: CircuitGraph, from: { name: string, port: string }, to: { name: string, port: string }) {
// 	graph[to.name].inPorts[to.port] = from
// }

function reduceClockBuffers(graph: CircuitGraph) {
	const visited: Set<string> = new Set()
	const frontier: string[] = []

	let clockBuffsRemoved = 0

	visited.add('clk')
	frontier.push('clk')

	while(frontier.length > 0) {
		const name = frontier.shift()!

		const node = graph[name]

		if(node.type === 'sky130_fd_sc_hd__clkbuf_16' || node.type === 'sky130_fd_sc_hd__clkbuf_8' || node.type === 'sky130_fd_sc_hd__clkbuf_4') {
			const inputConnection = node.inPorts['A']

			closeConnection(graph, inputConnection, name, node.outPorts['X'] ?? [])
			
			delete graph[name]

			clockBuffsRemoved++
		}
		
		for(const port of Object.keys(node.outPorts)) {
			for(const otherNode of node.outPorts[port]) {
				if(visited.has(otherNode.name)) continue

				visited.add(otherNode.name)
				frontier.push(otherNode.name)
			}
		}
	}

	console.log(`Removed ${clockBuffsRemoved} clock buffs!`)
}

function removeExtraneous(graph: CircuitGraph) {
	const ports = ['success', 'O[0]', 'O[1]', 'O[2]', 'O[3]', 'O[4]', 'O[5]', 'O[6]', 'O[7]']

	const portsServed: Record<string, Set<string>> = {}

	let nodesRemoved = 0

	for(const ioPort of ports) {
		const visited: Set<string> = new Set()
		const frontier: string[] = []

		visited.add(ioPort)
		frontier.push(ioPort)

		while(frontier.length > 0) {
			const name = frontier.shift()!

			const node = graph[name]

			if(!portsServed[name]) portsServed[name] = new Set()
			
			portsServed[name].add(ioPort)

			for(const port of Object.keys(node.inPorts)) {
				if(visited.has(node.inPorts[port].name)) continue

				visited.add(node.inPorts[port].name)
				frontier.push(node.inPorts[port].name)
			}
		}
	}

	const removed = new Set()

	const keys = Object.keys(graph)
	for(const name of keys) {
		if(portsServed[name] && portsServed[name].has('success')) continue 
		
		delete graph[name]

		removed.add(name)
			
		nodesRemoved++
	}


	for(const name of Object.keys(graph)) {
		for(const port of Object.keys(graph[name].outPorts)) {
			graph[name].outPorts[port] = graph[name].outPorts[port].filter(connection => !removed.has(connection.name))
		}
	}

	console.log(`Removed ${nodesRemoved} extra nodes!`)
}

function reduceRegisters(graph: CircuitGraph) {
	let registersInferred = 0
	
	const clockConnections = JSON.parse(JSON.stringify(graph['clk'].outPorts['clk']))
	for(const connection of clockConnections) {
		const name = connection.name
		const node = graph[name]

		const inputLockName = node.inPorts['D'].name
		const inputLockNode = graph[inputLockName]

		if(!node.outPorts['Q'].some(otherConnection => otherConnection.name === inputLockName) || inputLockNode.type !== 'sky130_fd_sc_hd__mux2_1') {
			console.warn(`Possible register didn't match recursive mux pattern ${name}!`)
			
			continue
		}

		const registerName = `register_${registersInferred}`

		graph[registerName] = {
			type: 'register',
			inPorts: {
				'reset_n': node.inPorts['RESET_B'],
				'clk': node.inPorts['CLK'],
				'next': graph[inputLockName].inPorts['A1'],
				'enable': graph[inputLockName].inPorts['S'],
			},
			outPorts: {
				'value': node.outPorts['Q'].filter(otherConnection => otherConnection.name !== inputLockName)
			}
		}

		if(graph[inputLockName].inPorts['A1'])
			closeConnection(graph, graph[inputLockName].inPorts['A1'], inputLockName, [{ name: registerName, port: 'next' }])
		
		if(graph[inputLockName].inPorts['S'])
			closeConnection(graph, graph[inputLockName].inPorts['S'], inputLockName, [{ name: registerName, port: 'enable' }])

		if(node.inPorts['RESET_B'])
			closeConnection(graph, node.inPorts['RESET_B'], name, [{ name: registerName, port: 'reset_n' }])
		
		if(node.inPorts['CLK'])
			closeConnection(graph, node.inPorts['CLK'], name, [{ name: registerName, port: 'clk' }])
		
		closeConnection(graph, { name: `register_${registersInferred}`, port: 'value' }, name, node.outPorts['Q'].filter(otherConnection => otherConnection.name !== inputLockName))

		delete graph[name]
		delete graph[inputLockName]

		registersInferred++
	}

	console.log(`Inferred ${registersInferred} registers!`)
}

function cleanName(name: string) {
	if(name.startsWith('sky130_fd_sc_hd__')) return name.substring('sky130_fd_sc_hd__'.length)

	return name
}

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
					inPorts: graph[name]?.inPorts ?? {},
					outPorts: {}
				}

				for(const port of Object.keys(instance.connections)) {
					if(!circuit.outPorts.includes(port)) continue

					const connectionId = instance.connections[port]

					if(outPorts.includes(connectionId)) {
						if(!graph[name].outPorts[port]) graph[name].outPorts[port] = []
						graph[name].outPorts[port].push({ name: connectionId, port: connectionId })

						if(!graph[connectionId]) graph[connectionId] = { type: 'input', inPorts: {}, outPorts: {} }
						graph[connectionId].inPorts[connectionId] = { name, port }

						if(visited.has(connectionId)) continue
					
						visited.add(connectionId)
						frontier.push(connectionId)
					} else {
						const connectingInstances = Object.entries(instances).filter(([_, instance]) => Object.values(instance.connections).some(connection => connection === connectionId)).map(([otherName, _]) => otherName)

						for(const otherName of connectingInstances) {
							if(otherName === name) continue

							if(!graph[name].outPorts[port]) graph[name].outPorts[port] = []
							graph[name].outPorts[port] = graph[name].outPorts[port].concat(
								Object.entries(instances[otherName].connections).filter(([_, connection]) => connection === connectionId).map(([port, _]) => ({ name: otherName, port }))
							)

							if(!graph[otherName]) graph[otherName] = { type: 'unknown', inPorts: {}, outPorts: {} }
							for(const [otherPort, _] of Object.entries(instances[otherName].connections).filter(([_, connection]) => connection === connectionId)) {
								graph[otherName].inPorts[otherPort] = { name, port }
							}
							
							if(visited.has(otherName)) continue
							
							visited.add(otherName)
							frontier.push(otherName)
						}
					}
				}
			} else {
				const connectingInstances = Object.entries(instances).filter(([_, instance]) => Object.values(instance.connections).some(connection => connection === name)).map(([otherName, _]) => otherName)

				graph[name] = {
					type: 'input',
					inPorts: graph[name]?.inPorts ?? {},
					outPorts: {}
				}

				if(outPorts.includes(name)) continue

				for(const otherName of connectingInstances) {
					if(otherName === name) continue

					if(!graph[name].outPorts[name]) graph[name].outPorts[name] = []
					graph[name].outPorts[name].push({ name: otherName, port: Object.entries(instances[otherName].connections).find(([port, connection]) => connection === name)![0] })

					if(!graph[otherName]) graph[otherName] = { type: 'unknown', inPorts: {}, outPorts: {} }
					for(const [otherPort, _] of Object.entries(instances[otherName].connections).filter(([_, connection]) => connection === name)) {
						graph[otherName].inPorts[otherPort] = { name, port: name }
					}
					
					if(visited.has(otherName)) continue
					
					visited.add(otherName)
					frontier.push(otherName)
				}
			}
		}

		reduceClockBuffers(graph)
		// reduceRegisters(graph)
		removeExtraneous(graph)

		return new Circuit(name, inPorts, outPorts, graph)
	}

	private generateSignalCode(context: { prelude: string, main: string, handledNodes: string[] }, name: string) {
		const node = this.graph[name]
		
		// console.log(name, node.type)

		if(node.type === 'input' && name !== 'success') {
		// if(node.type === 'input' && name !== 'S') {
			return 'io'
		}

		if([
			'sky130_fd_sc_hd__dfrtp_2',
			'sky130_fd_sc_hd__dfstp_2',
			'sky130_fd_sc_hd__dfxtp_2',
		].includes(node.type)) {
			if(!context.handledNodes.includes(name)) {
				context.handledNodes.push(name)

				const inputs: Record<string, string> = {}

				for(const port of Object.keys(node.inPorts)) {
					const value = this.generateSignalCode(context, node.inPorts[port].name)

					inputs[port] = `${value}.${node.inPorts[port].port}`
				}

				context.prelude += `\n${cleanName(name)} = new ${cleanName(node.type)}()`

				context.main += `\n${cleanName(name)}.next = ${cleanName(node.type)}.eval({${Object.entries(inputs).map(([key, value]) => `${key}: ${value}`).join(', ')}})`
			}
			
			return cleanName(name)
		}

		if(!context.handledNodes.includes(name)) {
			context.handledNodes.push(name)
			
			const inputs: Record<string, string> = {}

			for(const port of Object.keys(node.inPorts)) {
				const value = this.generateSignalCode(context, node.inPorts[port].name)

				inputs[port] = `${value}.${node.inPorts[port].port}`
			}

			context.main += `\nconst ${cleanName(name)} = ${cleanName(node.type)}({${Object.entries(inputs).map(([key, value]) => `${key}: ${value}`).join(', ')}})`
		}

		return cleanName(name)
	}

	public generateCode(): string {
		const context = { prelude: '', main: '', handledNodes: [] }

		this.generateSignalCode(context, 'success')
		// this.generateSignalCode(context, 'S')

		return context.prelude + '\n' + context.main
	}
}

const CIRCUIT_DEFINITIONS: Circuit[] = [
	new Circuit('sky130_fd_sc_hd__mux2_1', ['S', 'A0', 'A1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	
	new Circuit('sky130_fd_sc_hd__and2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and2b_2', ['A_N', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and3_2', ['A', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and3b_2', ['A_N', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and4_2', ['A', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and4b_2', ['A_N', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__and4bb_2', ['A_N', 'B_N', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or3_2', ['A', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or3b_2', ['A', 'B', 'C_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or4_2', ['A', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or4b_2', ['A', 'B', 'C', 'D_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__or4bb_2', ['A', 'B', 'C_N', 'D_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__xor2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	
	new Circuit('sky130_fd_sc_hd__nand2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nand2b_2', ['A_N', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nand3_2', ['A', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nand3b_2', ['A_N', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nand4_2', ['A', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor3_2', ['A', 'B', 'C', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor3b_2', ['A', 'B', 'C_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor4_2', ['A', 'B', 'C', 'D', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__nor4b_2', ['A', 'B', 'C', 'D_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__xnor2_2', ['A', 'B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__inv_2', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	
	new Circuit('sky130_fd_sc_hd__a21o_2', ['A1', 'A2', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a21bo_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a31o_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a211o_2', ['A1', 'A2', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a22o_2', ['A1', 'A2', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a31o_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a32o_2', ['A1', 'A2', 'A3', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a311o_2', ['A1', 'A2', 'A3', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__a221o_2', ['A1', 'A2', 'B1', 'B2', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o2bb2a_2', ['A1_N', 'A2_N', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o21a_2', ['A1', 'A2', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o21ba_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o22a_2', ['A1', 'A2', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o211a_2', ['A1', 'A2', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o311a_2', ['A1', 'A2', 'A3', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o31a_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o221a_2', ['A1', 'A2', 'B1', 'B2', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__o32a_2', ['A1', 'A2', 'A3', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),

	new Circuit('sky130_fd_sc_hd__a21oi_2', ['A1', 'A2', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a21boi_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a211oi_2', ['A1', 'A2', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a31oi_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a22oi_2', ['A1', 'A2', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a221oi_2', ['A1', 'A2', 'B1', 'B2', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a41oi_2', ['A1', 'A2', 'A3', 'A4', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__a2111oi_2', ['A1', 'A2', 'B1', 'C1', 'D1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o21ai_2', ['A1', 'A2', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o21bai_2', ['A1', 'A2', 'B1_N', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o211ai_2', ['A1', 'A2', 'B1', 'C1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o22ai_2', ['A1', 'A2', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o31ai_2', ['A1', 'A2', 'A3', 'B1', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),
	new Circuit('sky130_fd_sc_hd__o32ai_2', ['A1', 'A2', 'A3', 'B1', 'B2', 'VPWR', 'VGND', 'VPB', 'VND'], ['Y'], {}),

	new Circuit('sky130_fd_sc_hd__dfrtp_2', ['D', 'CLK', 'RESET_B', 'VPWR', 'VGND', 'VPB', 'VND'], ['Q'], {}),
	new Circuit('sky130_fd_sc_hd__dfstp_2', ['D', 'CLK', 'SET_B', 'SCD', 'SCE', 'VPWR', 'VGND', 'VPB', 'VND'], ['Q'], {}),
	new Circuit('sky130_fd_sc_hd__dfxtp_2', ['D', 'CLK', 'SCD', 'SCE', 'VPWR', 'VGND', 'VPB', 'VND'], ['Q'], {}),

	new Circuit('sky130_fd_sc_hd__decap_3', ['VPWR', 'VGND', 'VPB', 'VND'], [], {}),
	new Circuit('sky130_fd_sc_hd__diode_2', ['DIODE', 'VPWR', 'VGND', 'VPB', 'VND'], [], {}),
	new Circuit('sky130_fd_sc_hd__clkbuf_16', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__clkbuf_8', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__clkbuf_4', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
	new Circuit('sky130_fd_sc_hd__buf_2', ['A', 'VPWR', 'VGND', 'VPB', 'VND'], ['X'], {}),
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

		// circuits.push(Circuit.parse(circuitDefinitions['adder_demo'].lines, ['A', 'B', 'clk', 'en', 'rst_n', 'VGND', 'VPWR'], ['S'], CIRCUIT_DEFINITIONS, circuitDefinitions))
		circuits.push(Circuit.parse(circuitDefinitions['puzzle'].lines, ['I', 'clk', 'enable', 'rst_n', 'VGND', 'VPWR'], ['success', 'O[0]', 'O[1]', 'O[2]', 'O[3]', 'O[4]', 'O[5]', 'O[6]', 'O[7]'], CIRCUIT_DEFINITIONS, circuitDefinitions))

		return new Project(circuits)
	}
}

// const spiceSource = await Deno.readTextFile('./adder_demo.spice')
const spiceSource = await Deno.readTextFile('./puzzle.spice')
const project = Project.parse(spiceSource)

// await Deno.writeTextFile('../visualizer/src/data.json', JSON.stringify(project.circuits.find(circuit => circuit.name === 'adder_demo')?.graph, null, 2))
await Deno.writeTextFile('../visualizer/src/data.json', JSON.stringify(project.circuits.find(circuit => circuit.name === 'puzzle')?.graph, null, 2))
// await Deno.writeTextFile('.code.js', project.circuits.find(circuit => circuit.name === 'adder_demo')!.generateCode())
await Deno.writeTextFile('.code.js', project.circuits.find(circuit => circuit.name === 'puzzle')!.generateCode())