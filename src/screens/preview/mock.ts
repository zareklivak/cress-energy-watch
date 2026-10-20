/** SAMPLE VALUES for the Level 2 preview. Not sheet data, never counted in totals. */
export const NIGHT = ['10p', '11p', '12a', '1a', '2a', '3a', '4a', '5a', '6a']

export const PREVIEWS = [
  {
    id: 'boiler-cycling',
    title: 'Boiler 2 turning on and off too often overnight',
    body: 'Example: we would flag a night when starts per hour climb to 14 between 1 and 3 am, against a usual 3 to 5. Short cycling wears the burner and wastes gas.',
    needs: 'A read-only connection to the boiler controls',
    unit: 'starts per hour',
    series: [3, 4, 9, 12, 14, 13, 12, 6, 4],
    reference: { label: 'Usual', from: 3, to: 5 },
  },
  {
    id: 'pool-cover',
    title: 'Pool heater running with the cover off',
    body: 'Example: we would flag a night when the heater fires most of the time while the cover sensor reads open.',
    needs: 'Heater status and a cover sensor',
    unit: '% of the hour heating',
    series: [90, 95, 100, 100, 100, 95, 90, 85, 80],
    reference: { label: 'With cover on', from: 20, to: 35 },
  },
  {
    id: 'after-hours-heat',
    title: 'Common-area heat running after hours',
    body: 'Example: we would flag a night when the lobby holds 70°F, though the schedule sets it back to 62°F at 10 pm.',
    needs: 'Zone setpoints from the building control system',
    unit: '°F in the lobby',
    series: [70, 70, 70, 70, 70, 70, 70, 70, 70],
    reference: { label: 'Scheduled', from: 62, to: 62 },
  },
] as const
