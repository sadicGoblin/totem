import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CatalogueService, PlaylistVideo } from '../../services/catalogue.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  
  private refreshTimeout: any;
  private readonly REFRESH_DELAY = 5 * 60 * 1000; // 5 minutos
  
  // Playlist de videos
  videos: PlaylistVideo[] = [];
  currentVideoIndex = 0;
  currentVideoUrl = 'assets/videos/home_video.mp3'; // Fallback por defecto
  
  // Control de tiempo para conservar video local
  private videoStartTime: number = 0;

  constructor(
    private router: Router,
    private catalogueService: CatalogueService
  ) {}

  ngOnInit(): void {
    // Cargar videos de la playlist
    this.loadPlaylistVideos();
    
    // Programar refresh del catálogo después de 5 minutos en el screensaver
    this.refreshTimeout = setTimeout(() => {
      console.log('🔄 Refreshing catalogue after 5 minutes on welcome screen...');
      this.catalogueService.refreshCatalogue();
    }, this.REFRESH_DELAY);
  }

  ngOnDestroy(): void {
    // Cancelar el refresh si el usuario sale del screensaver
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Carga los videos de la playlist vertical desde el catálogo
   */
  private loadPlaylistVideos(): void {
    this.videos = this.catalogueService.getScreensaverVideos();
    
    if (this.videos.length > 0) {
      this.currentVideoIndex = 0;
      this.currentVideoUrl = this.videos[0].file_url || this.videos[0].file;
      this.videoStartTime = Date.now();
      console.log('🎬 Playlist loaded with', this.videos.length, 'videos');
      console.log('▶️ Playing:', this.videos[0].name);
    } else {
      console.log('⚠️ No playlist videos found, using fallback video');
    }
  }

  /**
   * Maneja el evento cuando un video termina
   */
  onVideoEnded(): void {
    if (this.videos.length <= 1) {
      // Si solo hay un video o ninguno, reiniciar el mismo
      this.restartCurrentVideo();
      return;
    }

    // Verificar si debemos respetar la duración del video actual
    const currentVideo = this.videos[this.currentVideoIndex];
    if (currentVideo && currentVideo.duration > 0) {
      const elapsedSeconds = (Date.now() - this.videoStartTime) / 1000;
      if (elapsedSeconds < currentVideo.duration) {
        // Aún no se cumple la duración, reiniciar el video
        this.restartCurrentVideo();
        return;
      }
    }

    // Pasar al siguiente video
    this.nextVideo();
  }

  /**
   * Pasa al siguiente video de la playlist
   */
  private nextVideo(): void {
    this.currentVideoIndex = (this.currentVideoIndex + 1) % this.videos.length;
    this.currentVideoUrl = this.videos[this.currentVideoIndex].file_url || this.videos[this.currentVideoIndex].file;
    this.videoStartTime = Date.now();
    
    console.log('▶️ Playing next video:', this.videos[this.currentVideoIndex].name);
    
    // Forzar la recarga del video
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.load();
      this.videoPlayer.nativeElement.play();
    }
  }

  /**
   * Reinicia el video actual
   */
  private restartCurrentVideo(): void {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.currentTime = 0;
      this.videoPlayer.nativeElement.play();
    }
  }

  navigateToCatalog() {
    this.router.navigate(['/home']);
  }
}
