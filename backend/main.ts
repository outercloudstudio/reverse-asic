class Circuit {
	private constructor(public name: string, public ports: string[], public instances: { name: string, type: string, connections: Record<string, { instance: string, port: string }> }[]) {}

	public static parse(lines: string[], circuitDefinitions: { name: string, ports: string[] }[]): Circuit {
		const items = lines[0].split(' ')
		const name = items[1]
		const ports = items.slice(2)

		if(name !== 'adder_demo') {
			return new Circuit(name, ports, [])
		}

		const instances: { name: string, type: string, connections: Record<string, { instance: string, port: string }> }[] = []

		for(const line of lines.slice(1)) {
			const instanceItems = line.split(' ')

			const instanceName = instanceItems[0].slice(1)
			const instanceType = instanceItems[instanceItems.length - 1]

			const connections: Record<string, { instance: string, port: string }> = {}

			for(let index = 0; index < instanceItems.length - 2; index++) {
				const connectionId = instanceItems[index + 1]
				const connectionInstance = connectionId.split('/')[0]
				const connectionPort = connectionId.split('/')[1]

				if(!connectionPort) {
					connections[circuitDefinitions.find(circuit => circuit.name === instanceType)!.ports[index]] = { instance: connectionInstance, port: connectionPort }
				} else {
					connections[circuitDefinitions.find(circuit => circuit.name === instanceType)!.ports[index]] = { instance: connectionInstance, port: connectionPort }
				}
			}
			
			instances.push({
				name: instanceName,
				type: instanceType,
				connections
			})
		}

		return new Circuit(name, ports, instances)
	}
}

class Project {
	private constructor(public circuits: Circuit[]) {}

	public static parse(text: string) {
		const circuitDefinitions: { name: string, ports: string[] }[] = []

		for(let line of text.split('\n')) {
			line = line.trim()

			if(line.length === 0) continue

			if(line.startsWith('.subckt')) {
				const items = line.split(' ')
				const name = items[1]
				const ports = items.slice(2)

				circuitDefinitions.push({ name, ports })

				continue
			}
		}		

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

				circuits.push(Circuit.parse(circuitContent, circuitDefinitions))

				continue
			}

			if(withinCircuit) {
				circuitContent.push(line)
			}
		}

		return new Project(circuits)
	}
}

const spiceSource = await Deno.readTextFile('./adder_demo.spice')
const project = Project.parse(spiceSource)

await Deno.writeTextFile('../visualizer/src/data.json', JSON.stringify(project.circuits, null, 2))

// console.log(project.circuits.find(circuit => circuit.name === 'adder_demo'))