enum GdsRecordType {
	HEADER = 0x0
}

enum GdsDataType {
	None = 0x0,
	BitArray = 0x1,
	SignedInteger2 = 0x2,
	SignedInteger4 = 0x3,
	Real4 = 0x4,
	Real8 = 0x5,
	Ascii = 0x6,
}

type GdsRecord = {
	recordType: GdsRecordType,
	data: boolean[] | number | string
	length: number
}

function parseRecord(pointer: number, buffer: Uint8Array): GdsRecord {
	const length = buffer[pointer] << 1 | buffer[pointer + 1]
	const recordType = <GdsRecordType>buffer[pointer + 2]
	const dataType = <GdsDataType>buffer[pointer + 3]
	const data = buffer.slice(pointer + 4, pointer + length)

	if(dataType === GdsDataType.Ascii) {
		const decoder = new TextDecoder()

		return {
			data: decoder.decode(data),
			recordType,
			length
		}
	}

	if(dataType === GdsDataType.SignedInteger2) {
		return {
			data: new DataView(buffer.buffer).getInt16(pointer),
			recordType,
			length
		}
	}

	if(dataType === GdsDataType.SignedInteger4) {
		return {
			data: new DataView(buffer.buffer).getInt32(pointer),
			recordType,
			length
		}
	}

	if(dataType === GdsDataType.Real8) {
		return {
			data: new DataView(buffer.buffer).getFloat64(pointer),
			recordType,
			length
		}
	}

	throw new Error(`Unknown data type ${dataType}!`)
}

const buffer = await Deno.readFile('./asic-puzzle-2026/warmup/04_final.gds')

let pointer = 0

let record = parseRecord(pointer, buffer)
pointer += record.length

record = parseRecord(pointer, buffer)
pointer += record.length

record = parseRecord(pointer, buffer)
pointer += record.length

record = parseRecord(pointer, buffer)
pointer += record.length

console.log(record)