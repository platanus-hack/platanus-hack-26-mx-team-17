/**
 * Mini-store para pasar coordenadas de foco entre pantallas sin router params.
 * El productor llama set() antes de navegar; el consumidor llama consume()
 * cuando la pantalla recupera el foco (useFocusEffect).
 */

let _pending: { lat: number; lng: number } | null = null;

export const focusStore = {
  set(coords: { lat: number; lng: number }) {
    _pending = coords;
  },
  consume(): { lat: number; lng: number } | null {
    const v = _pending;
    _pending = null;
    return v;
  },
};
