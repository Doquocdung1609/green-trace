export interface TrackAsiaAddressResult {
  formatted_address?: string;
  address_components?: Array<{
    long_name?: string;
    short_name?: string;
    types?: string[];
  }>;
}

export function parseTrackAsiaAddress(result: TrackAsiaAddressResult) {
  const components = result.address_components ?? [];
  const byType = (...types: string[]) =>
    components.find((component) =>
      component.types?.some((type) => types.includes(type)),
    )?.long_name ?? "";
  return {
    region: result.formatted_address ?? "",
    province: byType("administrative_area_level_1"),
    district: byType("administrative_area_level_2"),
    commune: byType(
      "administrative_area_level_3",
      "administrative_area_level_4",
      "locality",
      "sublocality",
    ),
  };
}
