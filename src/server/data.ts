import type {Driver, Promo, Vehicle} from "../shared/types.js";

// Catalogue de démonstration. À remplacer par une base de données ou par vos vraies données.
export const vehicles: Vehicle[] = [
  {
    "id": 0,
    "n": "Hyundai Tucson rouge",
    "d": "5 places · SUV compact",
    "buy": 15800000,
    "rent": 40000,
    "c": "#9E2A2B",
    "ph": [
      [
        "tf",
        "cover",
        "50% 50%",
        "Vue d’ensemble"
      ],
      [
        "tf",
        "240%",
        "100% 50%",
        "Face avant"
      ],
      [
        "tb",
        "cover",
        "50% 50%",
        "Vue arrière"
      ],
      [
        "tb",
        "260%",
        "67% 92%",
        "Jante"
      ]
    ],
    "note": "SUV compact au confort rassurant, à l’aise en ville comme sur les routes abîmées. Intérieur spacieux pour toute la famille.",
    "spec": {
      "p": 5,
      "b": "Automatique",
      "t": "Essence",
      "k": "Grand"
    }
  },
  {
    "id": 1,
    "n": "Berline Mercedes argent",
    "d": "5 places · boîte automatique",
    "buy": 13500000,
    "rent": 35000,
    "c": "#9AA6B8",
    "ph": [
      [
        "1",
        "cover",
        "50% 85%",
        "Vue d’ensemble"
      ],
      [
        "1",
        "220%",
        "7% 76%",
        "Face avant"
      ],
      [
        "1",
        "260%",
        "68% 83%",
        "Jante"
      ],
      [
        "1",
        "200%",
        "100% 80%",
        "Flanc"
      ]
    ],
    "note": "Élégante et confortable, le choix sûr pour les déplacements professionnels, les mariages et les longs trajets. Un chauffeur peut être ajouté sur demande.",
    "spec": {
      "p": 5,
      "b": "Automatique",
      "t": "Essence",
      "k": "Standard"
    }
  },
  {
    "id": 2,
    "n": "SUV coupé Mercedes rose",
    "d": "5 places · finition mate",
    "buy": 18500000,
    "rent": 45000,
    "c": "#E88FB8",
    "ph": [
      [
        "2",
        "cover",
        "50% 55%",
        "Vue d’ensemble"
      ],
      [
        "2",
        "220%",
        "0% 59%",
        "Face avant"
      ],
      [
        "2",
        "260%",
        "75% 73%",
        "Jante"
      ],
      [
        "2",
        "200%",
        "100% 50%",
        "Flanc"
      ]
    ],
    "note": "Un look qui ne passe pas inaperçu, idéal pour un anniversaire, un shooting ou une surprise. Haut sur roues, il reste confortable sur les routes abîmées.",
    "spec": {
      "p": 5,
      "b": "Automatique",
      "t": "Essence",
      "k": "Standard"
    }
  },
  {
    "id": 3,
    "n": "Jetour noir 4×4",
    "d": "5 places · look tout-terrain",
    "buy": 24000000,
    "rent": 65000,
    "c": "#1B2438",
    "ph": [
      [
        "jt",
        "cover",
        "50% 50%",
        "Vue d’ensemble"
      ],
      [
        "jt",
        "230%",
        "0% 33%",
        "Face avant"
      ],
      [
        "jt",
        "260%",
        "55% 68%",
        "Jante"
      ],
      [
        "jt",
        "200%",
        "100% 59%",
        "Flanc"
      ]
    ],
    "note": "Robuste, haut sur roues et très présent : à l’aise sur les pistes et les routes difficiles. Un véhicule qui en impose pour un déplacement ou un événement.",
    "spec": {
      "p": 5,
      "b": "Automatique",
      "t": "Essence",
      "k": "Grand"
    }
  },
  {
    "id": 4,
    "n": "Hyundai Tucson blanc",
    "d": "5 places · SUV spacieux",
    "buy": 14500000,
    "rent": 38000,
    "c": "#DCE7F2",
    "ph": [
      [
        "wf",
        "cover",
        "50% 50%",
        "Vue avant"
      ],
      [
        "wi",
        "cover",
        "50% 50%",
        "Intérieur"
      ],
      [
        "wr",
        "cover",
        "50% 50%",
        "Vue arrière"
      ],
      [
        "wf",
        "260%",
        "96% 61%",
        "Calandre"
      ]
    ],
    "note": "Clair, propre et facile à conduire. Vous voyez l’intérieur avant de réserver : rien n’est caché. Idéal pour voyager en famille.",
    "spec": {
      "p": 5,
      "b": "Automatique",
      "t": "Essence",
      "k": "Grand"
    }
  },
  {
    "id": 5,
    "n": "Jetour X70 argent",
    "d": "5 places · SUV moderne",
    "buy": 17500000,
    "rent": 45000,
    "c": "#9AA6B8",
    "ph": [
      [
        "x70",
        "cover",
        "50% 50%",
        "Vue d’ensemble"
      ],
      [
        "x70",
        "230%",
        "88% 50%",
        "Face avant"
      ],
      [
        "x70",
        "260%",
        "23% 78%",
        "Jante"
      ],
      [
        "x70",
        "200%",
        "0% 59%",
        "Flanc"
      ]
    ],
    "note": "SUV moderne et élégant, confortable pour les longs trajets en famille ou entre collègues.",
    "spec": {
      "p": 5,
      "b": "Automatique",
      "t": "Essence",
      "k": "Grand"
    }
  }
];

export const drivers: Driver[] = [
  {
    "id": 0,
    "n": "Moussa Bello",
    "y": 12,
    "r": "4,9",
    "l": "Français, anglais",
    "d": "Ancien chauffeur de direction. Ponctuel et discret, il connaît la ville sur le bout des doigts.",
    "rv": [
      [
        "Serge M.",
        "Toujours à l’heure et très respectueux. Mon client était ravi.",
        5
      ],
      [
        "Nadine T.",
        "Conduite souple et sécurisante, même dans les embouteillages.",
        5
      ]
    ]
  },
  {
    "id": 1,
    "n": "Jean-Paul Essomba",
    "y": 8,
    "r": "4,8",
    "l": "Français",
    "d": "Spécialiste des mariages et des cortèges. Véhicule toujours impeccable, décoré avec soin.",
    "rv": [
      [
        "Awa K.",
        "Il a géré tout le cortège avec calme. Mariage réussi !",
        5
      ],
      [
        "Pauline R.",
        "Très professionnel et souriant.",
        4
      ]
    ]
  },
  {
    "id": 2,
    "n": "Fatou Diallo",
    "y": 6,
    "r": "4,9",
    "l": "Français, anglais",
    "d": "Conduite douce, idéale pour les familles, les enfants et les personnes âgées.",
    "rv": [
      [
        "Carine N.",
        "Mes enfants étaient rassurés, elle roule avec beaucoup de prudence.",
        5
      ],
      [
        "Henri B.",
        "Très aimable et attentionnée.",
        5
      ]
    ]
  },
  {
    "id": 3,
    "n": "Ibrahim Tchoua",
    "y": 15,
    "r": "4,7",
    "l": "Français",
    "d": "Longs trajets et routes difficiles. Il connaît bien la mécanique et anticipe les imprévus.",
    "rv": [
      [
        "Marc A.",
        "Voyage de 8 heures sans aucun souci. Chauffeur très expérimenté.",
        5
      ],
      [
        "Estelle F.",
        "Un peu réservé, mais très sûr au volant.",
        4
      ]
    ]
  }
];

export const promos: Promo[] = [
  {
    "c": 1,
    "pct": 15,
    "end": "2026-11-30T23:59:00",
    "t": "Spécial fin d’année"
  },
  {
    "c": 2,
    "pct": 10,
    "end": "2026-11-23T23:59:00",
    "t": "Offre du week-end"
  },
  {
    "c": 4,
    "pct": 20,
    "end": "2026-12-07T23:59:00",
    "t": "Voyagez en famille"
  }
];
