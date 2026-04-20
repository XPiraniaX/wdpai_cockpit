<?php

require_once 'AppController.php';

class DashboardController extends AppController {
    public function index() {
        $title = "1 - Dashboard";

        $stats = [
            'nextInspectionDate' => '--.--.----',
            'nextInspectionCar' => '-',
            'nextInsuranceDate' => '--.--.----',
            'nextInsuranceCar' => '-',
            'lastFuelAmount' => '-',
            'lastFuelMeta' => '-',
            'carCount' => '-',
            'carCountMeta' => '-',
        ];

        $cars = [
            [
                'year' => '2022',
                'title' => '-',
                'subtitle' => '-',
                'inspectionDate' => '--.--.----',
                'insuranceDate' => '--.--.----',
                'silhouetteClass' => '',
            ],
            [
                'year' => '2021',
                'title' => '-',
                'subtitle' => '-',
                'inspectionDate' => '--.--.----',
                'insuranceDate' => '--.--.----',
                'silhouetteClass' => ' is-blue',
            ],
            [
                'year' => '2022',
                'title' => '-',
                'subtitle' => '-',
                'inspectionDate' => '--.--.----',
                'insuranceDate' => '--.--.----',
                'silhouetteClass' => ' is-silver',
            ],
        ];

        return $this->render("dashboard", [
            "title" => $title,
            "stats" => $stats,
            "cars" => $cars,
        ]);
    }
}
