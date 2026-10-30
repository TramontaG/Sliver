export const onSpawn = () => {
	return function (
		_target: object,
		_propertyKey: string,
		descriptor: PropertyDescriptor
	): void {
		const original = descriptor.value as (() => void) | undefined;

		descriptor.value = function (): void {
			console.log("Running @onSpawn decorator");
			original?.call(this);
		};
	};
};
