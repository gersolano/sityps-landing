// Normaliza
export function normalizeModulo(m = "") {
  return String(m || "")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "")
    .trim().toLowerCase()
    .replace(/\s+/g, "-");
}

// Etiquetas que ve el usuario en el selector del editor
export const MODULOS_LIST = [
  "Secretaría General",
  "Organización, Actas y Acuerdos",
  "Asuntos Laborales",
  "Formación, Capacitación y Desarrollo Profesional",
  "Escalafón y Promoción de Plazas",
  "Créditos, Vivienda y Prestaciones Económicas",
  "Relaciones, Prensa y Propaganda",
  "Finanzas",
  "Fomento Cultural y Deportivo",
  "Mujer y Equidad de Género",
  "Comité de Honor y Justicia",
  "Comité Electoral",
  "Representación Regional Tuxtepec",
  "Representación Regional Pochutla",
  "Representación Regional Valles Centrales",
  "Soporte Técnico",
];

// ALIAS: diferentes formas de escribir el mismo módulo → clave canónica
const ALIASES = {
  // Asuntos Laborales
  [normalizeModulo("Secretaría de Asuntos Laborales")]: normalizeModulo("Asuntos Laborales"),
  [normalizeModulo("Secretaria de Asuntos Laborales")]: normalizeModulo("Asuntos Laborales"),
  [normalizeModulo("Asuntos laborales")]: normalizeModulo("Asuntos Laborales"),

  // Secretaría General
  [normalizeModulo("Secretaria General")]: normalizeModulo("Secretaría General"),

  // Organización, Actas y Acuerdos
  [normalizeModulo("Actas y Acuerdos")]: normalizeModulo("Organización, Actas y Acuerdos"),
  [normalizeModulo("Secretaría de Organización, Actas y Acuerdos")]: normalizeModulo("Organización, Actas y Acuerdos"),
  [normalizeModulo("Secretaria de Organización Actas y Acuerdos")]: normalizeModulo("Organización, Actas y Acuerdos"),

  // ... agrega más alias si necesitas (mismo patrón)
};

// Datos reales
const RAW = {
  "Secretaría General": {
    nombre: "Laura Cerqueda de La Rosa",
    puesto: "Secretaria General",
    correo: "lcdlr75@hotmail.com",
  },
  "Organización, Actas y Acuerdos": {
    nombre: "Fredi Fernando Vazquez Aguilar",
    puesto: "Secretaria de Organización Actas y Acuerdos",
    correo: "antrop.fredi@hotmail.com",
  },
  "Asuntos Laborales": {
    nombre: "Carlos Alberto Ramirez Cruz",
    puesto: "Secretaria de Asuntos Laborales",
    correo: "ramirezcruzcarlosalberto@gmail.com",
  },
  "Formación, Capacitación y Desarrollo Profesional": {
    nombre: "Eduardo Escobar Vasquez",
    puesto: "Secretaria de Formacion, Capacitacion y Desarrollo Profesional",
    correo: "senzato@hotmail.com",
  },
  "Escalafón y Promoción de Plazas": {
    nombre: "Otoniel Gerson Solano Talledos",
    puesto: "Secretaria de Escalafon y Promocion De Plazas",
    correo: "otoniel.solano@gmail.com",
  },
  "Créditos, Vivienda y Prestaciones Económicas": {
    nombre: "Saidel Mateos Vicente",
    puesto: "Secretaria de Creditos, Vivienda y Prestaciones Economicas",
    correo: "mateossaidel@gmail.com",
  },
  "Relaciones, Prensa y Propaganda": {
    nombre: "Gabriel Alberto Cardeño Maldonado",
    puesto: "Secretaria de Relaciones Prensa y Propaganda",
    correo: "kero_kerveros@outlook.com",
  },
  "Finanzas": {
    nombre: "Lidia Elisa Olivares Hernandez",
    puesto: "Secretaria de Finanzas",
    correo: "lidyvres@gmail.com",
  },
  "Fomento Cultural y Deportivo": {
    nombre: "Beatriz Adriana Castellanos Lopez",
    puesto: "Secretaria de Fomento Cultural y Deportivo",
    correo: "adry-86@hotmail.com",
  },
  "Mujer y Equidad de Género": {
    nombre: "Petra Remedios Hernandez Velasco",
    puesto: "Secretaria de La Mujer y Equidad De Genero",
    correo: "premedios06@hotmail.com",
  },
  "Comité de Honor y Justicia": {
    nombre: "Juan Altamirano Vasquez",
    puesto: "Presidente Comite Honor y Justicia",
    correo: "docjav61@hotmail.com",
  },
  "Comité Electoral": {
    nombre: "Eva Sanchez Perez",
    puesto: "Presidente Comite Electoral",
    correo: "ap2011@hotmail.com",
  },
  "Representación Regional Tuxtepec": {
    nombre: "David Avendaño Martinez",
    puesto: "Representante Regional Tuxtepec",
    correo: "davidamtz1@hotmail.com",
  },
  "Representación Regional Pochutla": {
    nombre: "Adolfo Ramos Castillo",
    puesto: "Representante Regional Pochutla",
    correo: "castilloraton67@gmail.com",
  },
  "Representación Regional Valles Centrales": {
    nombre: "Rebeca Reyes Hernandez",
    puesto: "Representante Regional Valle Centrales",
    correo: "ukyo02mosha@gmail.com",
  },
  "Soporte Técnico": {
    nombre: "Soporte Tecnico",
    puesto: "Soporte",
    correo: "otoniel.solano.web@gmail.com",
  },
};

// Construye el mapa normalizado
const RESPONSABLES_POR_MODULO = {};
for (const label of Object.keys(RAW)) {
  RESPONSABLES_POR_MODULO[normalizeModulo(label)] = RAW[label];
}
// Alias → apuntan al mismo objeto
for (const k of Object.keys(ALIASES)) {
  const target = ALIASES[k];
  if (RESPONSABLES_POR_MODULO[target]) {
    RESPONSABLES_POR_MODULO[k] = RESPONSABLES_POR_MODULO[target];
  }
}

export default RESPONSABLES_POR_MODULO;
