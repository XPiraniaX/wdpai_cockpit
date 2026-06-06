<?php

class AdminController extends AppController
{
    public function index(): void
    {
        $this->requireAdmin();

        $this->render('admin', [
            'title' => 'Panel administratora',
            'styleFiles' => [
                'base.css',
                'layout.css',
                'navi.css',
                'header.css',
                'dashboard.css',
                'community.css',
                'my_cars.css',
                'settings.css',
                'vehicle_details.css',
            ],
        ]);
    }
}
