pipeline {
  agent any

  options {
    skipDefaultCheckout(true)
    timestamps()
  }

  triggers {
    // Polling is fine for local Jenkins
    pollSCM('H/2 * * * *')
  }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build & Test') {
      steps {
        dir('app') {
          sh 'npm ci || npm install'
          sh 'npm test'
        }
      }
    }

    stage('Deploy to TEST') {
      when { branch 'dev' } // deploy to TEST from dev branch
      steps {
        sh 'chmod +x scripts/deploy.sh'
        sh './scripts/deploy.sh test'
      }
    }

    stage('Smoke Test (TEST)') {
      when { branch 'dev' }
      steps {
        sh 'curl -fsS http://localhost:3001/health | tee smoke_test_output_test.txt'
      }
    }

    // Manual approval before PROD
    stage('Approve PROD Deploy') {
      when { branch 'main' } // only ask for approval on main (prod)
      steps {
        input message: 'Deploy to PROD?', ok: 'Ship it'
      }
    }

    stage('Deploy to PROD') {
      when { branch 'main' }
      steps {
        sh 'chmod +x scripts/deploy.sh'
        sh './scripts/deploy.sh prod'
      }
    }

    stage('Smoke Test (PROD)') {
      when { branch 'main' }
      steps {
        sh 'curl -fsS http://localhost:3002/health | tee smoke_test_output_prod.txt'
      }
    }
  }

  post {
    always {
      echo "Build finished."
      archiveArtifacts artifacts: 'smoke_test_output_*.txt', onlyIfSuccessful: false
    }
  }
}
